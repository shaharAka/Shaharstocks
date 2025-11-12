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
        insider_titles: List[str] = None,
        min_transaction_value: int = None,
        previous_day_only: bool = False,
        insider_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent insider purchase transactions with pagination and retry logic
        
        Args:
            limit: Maximum number of transactions to fetch
            insider_titles: Filter by insider titles (e.g., ["CEO", "CFO", "Director"])
            min_transaction_value: Minimum transaction value in dollars
            previous_day_only: Only fetch transactions from previous day
            insider_name: Filter by specific insider name (case-insensitive partial match)
        
        Returns:
            List of insider trading transactions
        """
        transactions = []
        page = 1
        max_pages = 20  # Safety limit: ~1000 raw transactions (50 per page)
        
        # Fetch multiple pages until we have enough filtered results
        while len(transactions) < limit and page <= max_pages:
            # OpenInsider URL for latest purchases with pagination
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
                        return transactions
                    
                    # Parse table rows
                    page_transactions = []
                    tbody = table.find('tbody')
                    if tbody:
                        rows = tbody.find_all('tr')
                        
                        # If no rows, we've reached the end
                        if len(rows) == 0:
                            print(f"No more data on page {page}, stopping pagination", file=sys.stderr)
                            return transactions
                        
                        for row in rows:
                            # Check if we have enough transactions already
                            if len(transactions) >= limit:
                                break
                            
                            cells = row.find_all('td')
                            if len(cells) < 10:
                                continue
                            
                            # Extract data from cells
                            try:
                                # Find ticker link
                                ticker_cell = cells[3] if len(cells) > 3 else None
                                ticker = ticker_cell.get_text(strip=True) if ticker_cell else ""
                                
                                # Company name
                                company_cell = cells[4] if len(cells) > 4 else None
                                company_name = company_cell.get_text(strip=True) if company_cell else ""
                                
                                # Trade date
                                trade_date_cell = cells[2] if len(cells) > 2 else None
                                trade_date_text = trade_date_cell.get_text(strip=True) if trade_date_cell else ""
                                
                                # Filing date (when it was reported)
                                filing_date_cell = cells[1] if len(cells) > 1 else None
                                filing_date_text = filing_date_cell.get_text(strip=True) if filing_date_cell else ""
                                
                                # Trade type (should be P for Purchase)
                                trade_type_cell = cells[7] if len(cells) > 7 else None
                                trade_type = trade_type_cell.get_text(strip=True) if trade_type_cell else ""
                                
                                # Price
                                price_cell = cells[8] if len(cells) > 8 else None
                                price_text = price_cell.get_text(strip=True).replace('$', '').replace(',', '') if price_cell else "0"
                                try:
                                    price = float(price_text) if price_text else 0.0
                                except ValueError:
                                    price = 0.0
                                
                                # Quantity
                                qty_cell = cells[9] if len(cells) > 9 else None
                                qty_text = qty_cell.get_text(strip=True).replace(',', '').replace('+', '') if qty_cell else "0"
                                try:
                                    quantity = int(qty_text) if qty_text else 0
                                except ValueError:
                                    quantity = 0
                                
                                # Value
                                value_cell = cells[12] if len(cells) > 12 else None
                                value_text = value_cell.get_text(strip=True).replace('$', '').replace(',', '').replace('+', '') if value_cell else "0"
                                try:
                                    value = float(value_text) if value_text else 0.0
                                except ValueError:
                                    value = 0.0
                                
                                # Insider name
                                insider_cell = cells[5] if len(cells) > 5 else None
                                scraped_insider_name = insider_cell.get_text(strip=True) if insider_cell else ""
                                
                                # Insider title
                                insider_title_cell = cells[6] if len(cells) > 6 else None
                                insider_title = insider_title_cell.get_text(strip=True) if insider_title_cell else ""
                                
                                # Only include purchases (P or "P - Purchase") with valid data
                                if not (trade_type.startswith("P") and ticker and price > 0):
                                    continue
                                
                                # Apply filters
                                # Filter by previous day only
                                if previous_day_only:
                                    try:
                                        trade_date = datetime.strptime(trade_date_text, "%Y-%m-%d")
                                        yesterday = datetime.now() - timedelta(days=1)
                                        if trade_date.date() != yesterday.date():
                                            continue
                                    except:
                                        # Skip if date parsing fails
                                        continue
                                
                                # Filter by insider titles
                                if insider_titles and len(insider_titles) > 0:
                                    # Check if any of the filter titles appear in the insider's title
                                    title_match = any(
                                        filter_title.upper() in insider_title.upper() 
                                        for filter_title in insider_titles
                                    )
                                    if not title_match:
                                        continue
                                
                                # Filter by minimum transaction value
                                if min_transaction_value and value < min_transaction_value:
                                    continue
                                
                                # Filter by insider name (case-insensitive partial match)
                                if insider_name and insider_name.upper() not in scraped_insider_name.upper():
                                    continue
                                
                                transaction = {
                                    "ticker": ticker,
                                    "companyName": company_name,
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
                    transactions.extend(page_transactions)
                    print(f"Page {page}: fetched {len(page_transactions)} filtered transactions ({len(transactions)} total)", file=sys.stderr)
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
                return transactions
            
            # Move to next page
            page += 1
            time.sleep(1)  # Be nice to the server
        
        # Pagination complete
        return transactions

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
    
    if len(sys.argv) >= 3:
        try:
            filters = json.loads(sys.argv[2])
            insider_titles = filters.get("insiderTitles")
            min_transaction_value = filters.get("minTransactionValue")
            previous_day_only = filters.get("previousDayOnly", False)
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid filters JSON: {e}", file=sys.stderr)
    
    scraper = OpenInsiderScraper()
    transactions = scraper.fetch_insider_purchases(
        limit=limit,
        insider_titles=insider_titles,
        min_transaction_value=min_transaction_value,
        previous_day_only=previous_day_only
    )
    
    # Output as JSON to stdout
    print(json.dumps(transactions, indent=2))

if __name__ == "__main__":
    main()
