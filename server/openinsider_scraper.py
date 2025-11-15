#!/usr/bin/env python3
"""
OpenInsider Scraper - Fetches insider trading data from openinsider.com
Based on: https://github.com/sd3v/openinsiderData
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
import time
from urllib.parse import quote

class OpenInsiderScraper:
    def __init__(self):
        self.base_url = "http://openinsider.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        self.max_retries = 3
        self.retry_delay = 2  # seconds
    
    def fetch_insider_purchases(
        self, 
        limit: int = 100,
        insider_titles: List[str] | None = None,
        min_transaction_value: int | None = None,
        previous_day_only: bool = False,
        insider_name: str | None = None,
        ticker: str | None = None
    ) -> Dict[str, Any]:
        """
        Fetch recent insider purchase transactions with pagination and retry logic
        
        Args:
            limit: Maximum number of transactions to fetch (after filtering)
            insider_titles: Filter by insider titles (e.g., ["CEO", "CFO", "Director"])
            min_transaction_value: Minimum transaction value in dollars
            previous_day_only: Only fetch transactions from previous day
            insider_name: Filter by specific insider name (case-insensitive partial match)
            ticker: Filter by specific stock ticker (uses OpenInsider's screener endpoint)
        
        Returns:
            Dictionary with transactions and filtering statistics
        """
        all_transactions = []
        filtered_transactions = []
        
        # Track filtering statistics
        filter_stats = {
            "total_rows_scraped": 0,
            "filtered_not_purchase": 0,
            "filtered_invalid_data": 0,
            "filtered_by_date": 0,
            "filtered_by_title": 0,
            "filtered_by_transaction_value": 0,
            "filtered_by_insider_name": 0,
        }
        
        page = 1
        # When filtering by insider name without ticker, fetch more pages
        max_pages = 50 if (insider_name and not ticker) else 20
        
        if insider_name and ticker:
            print(f"[OpenInsider] Searching for insider: {insider_name} in {ticker}", file=sys.stderr)
        elif insider_name:
            print(f"[OpenInsider] Searching for insider: {insider_name}", file=sys.stderr)
        elif ticker:
            print(f"[OpenInsider] Fetching trades for {ticker}", file=sys.stderr)
        
        # Fetch multiple pages until we have enough filtered results
        while len(filtered_transactions) < limit and page <= max_pages:
            # Use ticker-specific screener if provided (much faster!)
            if ticker:
                url = f"{self.base_url}/screener?s={ticker.upper()}"
                if page > 1:
                    url += f"&page={page}"
            else:
                # Use the reliable latest-insider-purchases-25k endpoint
                url = f"{self.base_url}/latest-insider-purchases-25k?page={page}"
            
            last_error = None
            page_transactions = None
            
            for attempt in range(self.max_retries):
                try:
                    response = requests.get(url, headers=self.headers, timeout=30)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Find the screener table
                    table = soup.find('table', {'class': 'tinytable'})
                    if not table:
                        print(f"No data table found on page {page}, stopping pagination", file=sys.stderr)
                        return {
                            "transactions": filtered_transactions,
                            "stats": filter_stats
                        }
                    
                    # Parse table rows
                    page_transactions = []
                    tbody = table.find('tbody')
                    if tbody:
                        rows = tbody.find_all('tr')
                        
                        # If no rows, we've reached the end
                        if len(rows) == 0:
                            print(f"No more data on page {page}, stopping pagination", file=sys.stderr)
                            return {
                                "transactions": filtered_transactions,
                                "stats": filter_stats
                            }
                        
                        for row in rows:
                            # Check if we have enough transactions already
                            if len(filtered_transactions) >= limit:
                                break
                            
                            cells = row.find_all('td')
                            if len(cells) < 10:
                                continue
                            
                            filter_stats["total_rows_scraped"] += 1
                            
                            # Extract data from cells
                            try:
                                # Find ticker link
                                ticker_cell = cells[3] if len(cells) > 3 else None
                                ticker_text = ticker_cell.get_text(strip=True) if ticker_cell else ""
                                
                                # Detect page layout by checking if cell 4 contains company name or insider name
                                # Screener page (with ticker filter): no company name column, Cell 4 = insider name
                                # General page: Cell 4 = company name, Cell 5 = insider name
                                is_screener_layout = bool(ticker)  # If we're filtering by ticker, it's screener layout
                                
                                if is_screener_layout:
                                    # Screener layout (no company name column)
                                    company_name = ""  # Not available on screener page
                                    insider_name_idx = 4
                                    insider_title_idx = 5
                                    trade_type_idx = 6
                                    price_idx = 7
                                    quantity_idx = 8
                                    value_idx = 11
                                else:
                                    # General layout (with company name column)
                                    company_cell = cells[4] if len(cells) > 4 else None
                                    company_name = company_cell.get_text(strip=True) if company_cell else ""
                                    insider_name_idx = 5
                                    insider_title_idx = 6
                                    trade_type_idx = 7
                                    price_idx = 8
                                    quantity_idx = 9
                                    value_idx = 12
                                
                                # Trade date
                                trade_date_cell = cells[2] if len(cells) > 2 else None
                                trade_date_text = trade_date_cell.get_text(strip=True) if trade_date_cell else ""
                                
                                # Filing date (when it was reported)
                                filing_date_cell = cells[1] if len(cells) > 1 else None
                                filing_date_text = filing_date_cell.get_text(strip=True) if filing_date_cell else ""
                                
                                # Trade type (should be P for Purchase)
                                trade_type_cell = cells[trade_type_idx] if len(cells) > trade_type_idx else None
                                trade_type = trade_type_cell.get_text(strip=True) if trade_type_cell else ""
                                
                                # Price
                                price_cell = cells[price_idx] if len(cells) > price_idx else None
                                price_text = price_cell.get_text(strip=True).replace('$', '').replace(',', '') if price_cell else "0"
                                try:
                                    price = float(price_text) if price_text else 0.0
                                except ValueError:
                                    price = 0.0
                                
                                # Quantity
                                qty_cell = cells[quantity_idx] if len(cells) > quantity_idx else None
                                qty_text = qty_cell.get_text(strip=True).replace(',', '').replace('+', '') if qty_cell else "0"
                                try:
                                    quantity = int(qty_text) if qty_text else 0
                                except ValueError:
                                    quantity = 0
                                
                                # Value
                                value_cell = cells[value_idx] if len(cells) > value_idx else None
                                value_text = value_cell.get_text(strip=True).replace('$', '').replace(',', '').replace('+', '') if value_cell else "0"
                                try:
                                    value = float(value_text) if value_text else 0.0
                                except ValueError:
                                    value = 0.0
                                
                                # Insider name
                                insider_cell = cells[insider_name_idx] if len(cells) > insider_name_idx else None
                                scraped_insider_name = insider_cell.get_text(strip=True) if insider_cell else ""
                                
                                # Insider title
                                insider_title_cell = cells[insider_title_idx] if len(cells) > insider_title_idx else None
                                insider_title = insider_title_cell.get_text(strip=True) if insider_title_cell else ""
                                
                                # Only include purchases (P or "P - Purchase") with valid data
                                if not trade_type.startswith("P"):
                                    filter_stats["filtered_not_purchase"] += 1
                                    continue
                                
                                if not (ticker_text and price > 0):
                                    filter_stats["filtered_invalid_data"] += 1
                                    continue
                                
                                # Apply filters
                                # Filter by previous day only
                                if previous_day_only:
                                    try:
                                        trade_date = datetime.strptime(trade_date_text, "%Y-%m-%d")
                                        yesterday = datetime.now() - timedelta(days=1)
                                        if trade_date.date() != yesterday.date():
                                            filter_stats["filtered_by_date"] += 1
                                            continue
                                    except:
                                        # Skip if date parsing fails
                                        filter_stats["filtered_by_date"] += 1
                                        continue
                                
                                # Filter by insider titles
                                if insider_titles and len(insider_titles) > 0:
                                    # Check if any of the filter titles appear in the insider's title
                                    title_match = any(
                                        filter_title.upper() in insider_title.upper() 
                                        for filter_title in insider_titles
                                    )
                                    if not title_match:
                                        filter_stats["filtered_by_title"] += 1
                                        continue
                                
                                # Filter by minimum transaction value
                                if min_transaction_value and value < min_transaction_value:
                                    filter_stats["filtered_by_transaction_value"] += 1
                                    continue
                                
                                # Filter by insider name (case-insensitive partial match)
                                if insider_name and insider_name.lower() not in scraped_insider_name.lower():
                                    filter_stats["filtered_by_insider_name"] += 1
                                    continue
                                
                                transaction = {
                                    "ticker": ticker_text,
                                    "companyName": company_name or ticker_text,  # Use ticker if company name not available
                                    "insiderName": scraped_insider_name,
                                    "insiderTitle": insider_title,
                                    "tradeDate": trade_date_text,
                                    "filingDate": filing_date_text,
                                    "tradeType": trade_type,
                                    "price": price,
                                    "quantity": quantity,
                                    "value": value,
                                    "recommendation": "buy",  # All purchases are BUY signals
                                    "confidence": 75  # Default confidence score
                                }
                                page_transactions.append(transaction)
                            
                            except Exception as e:
                                print(f"Error parsing row: {e}", file=sys.stderr)
                                continue
                    
                    # Successfully fetched page, add to results and break retry loop
                    filtered_transactions.extend(page_transactions)
                    print(f"Page {page}: fetched {len(page_transactions)} filtered transactions ({len(filtered_transactions)} total)", file=sys.stderr)
                    break  # Success, exit retry loop
                
                except requests.exceptions.Timeout as e:
                    last_error = f"Request timeout (attempt {attempt + 1}/{self.max_retries}): {e}"
                    print(last_error, file=sys.stderr)
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))  # Exponential backoff
                        continue
                except requests.exceptions.ConnectionError as e:
                    last_error = f"Connection error (attempt {attempt + 1}/{self.max_retries}): {e}"
                    print(last_error, file=sys.stderr)
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay * (attempt + 1))
                        continue
                except requests.exceptions.HTTPError as e:
                    last_error = f"HTTP error {e.response.status_code if e.response else 'unknown'}: {e}"
                    print(last_error, file=sys.stderr)
                    # Don't retry on 4xx errors (client errors)
                    if e.response and 400 <= e.response.status_code < 500:
                        break
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
                except requests.exceptions.RequestException as e:
                    last_error = f"Request error (attempt {attempt + 1}/{self.max_retries}): {e}"
                    print(last_error, file=sys.stderr)
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delay)
                        continue
                except Exception as e:
                    last_error = f"Unexpected error parsing OpenInsider data: {e}"
                    print(last_error, file=sys.stderr)
                    break
            
            # Check if retry loop succeeded
            if last_error:
                # All retries failed for this page, stop pagination
                print(f"Failed to fetch page {page} after {self.max_retries} attempts. Last error: {last_error}", file=sys.stderr)
                return {
                    "transactions": filtered_transactions,
                    "stats": filter_stats
                }
            
            # Move to next page
            page += 1
            time.sleep(1)  # Be nice to the server
        
        # Pagination complete - return transactions with statistics
        return {
            "transactions": filtered_transactions,
            "stats": filter_stats
        }

def main():
    """Main entry point for the scraper"""
    if len(sys.argv) < 2:
        print("Usage: python openinsider_scraper.py <limit> [filters_json]", file=sys.stderr)
        sys.exit(1)
    
    try:
        limit = int(sys.argv[1])
    except ValueError:
        print("Error: limit must be an integer", file=sys.stderr)
        sys.exit(1)
    
    # Parse optional filters from JSON
    insider_titles = None
    min_transaction_value = None
    previous_day_only = False
    insider_name = None
    ticker = None
    
    if len(sys.argv) >= 3:
        try:
            filters = json.loads(sys.argv[2])
            insider_titles = filters.get("insiderTitles")
            min_transaction_value = filters.get("minTransactionValue")
            previous_day_only = filters.get("previousDayOnly", False)
            insider_name = filters.get("insiderName")
            ticker = filters.get("ticker")
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid filters JSON: {e}", file=sys.stderr)
    
    scraper = OpenInsiderScraper()
    result = scraper.fetch_insider_purchases(
        limit=limit,
        insider_titles=insider_titles,
        min_transaction_value=min_transaction_value,
        previous_day_only=previous_day_only,
        insider_name=insider_name,
        ticker=ticker
    )
    
    # Output as JSON to stdout
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
