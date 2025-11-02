import axios from 'axios';

interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  form: string;
  fileNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

interface SECSubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      form: string[];
      fileNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

export class SECEdgarService {
  private baseUrl = 'https://data.sec.gov';
  private userAgent: string;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // Minimum 100ms between requests (max 10 requests/second)

  constructor() {
    // SEC requires a user-agent header with contact information per their API documentation
    // Reference: https://www.sec.gov/about/webmaster-frequently-asked-questions#developers
    this.userAgent = 'TradePro Dashboard contact@tradepro.app';
  }

  /**
   * Rate limiting to comply with SEC API usage policies
   * Ensures we don't overwhelm the SEC servers with requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get company CIK number from ticker symbol
   * Uses SEC's company tickers JSON to lookup CIK
   */
  async getCIKFromTicker(ticker: string): Promise<string | null> {
    try {
      await this.rateLimit();
      
      // Correct URL is www.sec.gov not data.sec.gov for company_tickers.json
      const response = await axios.get('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': this.userAgent }
      });

      const companies = response.data;
      
      // Find company by ticker
      for (const key in companies) {
        const company = companies[key];
        if (company.ticker === ticker.toUpperCase()) {
          // CIK needs to be padded to 10 digits with leading zeros
          return String(company.cik_str).padStart(10, '0');
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching CIK for ticker ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get company submissions (all filings) by CIK
   */
  async getCompanySubmissions(cik: string): Promise<SECSubmissions | null> {
    try {
      await this.rateLimit();
      
      const paddedCik = cik.padStart(10, '0');
      const response = await axios.get(`${this.baseUrl}/submissions/CIK${paddedCik}.json`, {
        headers: { 'User-Agent': this.userAgent }
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching submissions for CIK ${cik}:`, error);
      return null;
    }
  }

  /**
   * Get latest 10-K or 10-Q filing for a company
   */
  async getLatestFiling(ticker: string, formTypes: string[] = ['10-K', '10-Q']): Promise<{
    formType: string;
    filingDate: string;
    filingUrl: string;
    cik: string;
  } | null> {
    try {
      // Get CIK from ticker
      const cik = await this.getCIKFromTicker(ticker);
      if (!cik) {
        console.log(`CIK not found for ticker: ${ticker}`);
        return null;
      }

      // Get all company submissions
      const submissions = await this.getCompanySubmissions(cik);
      if (!submissions) {
        return null;
      }

      // Find the most recent filing of specified types
      const recent = submissions.filings.recent;
      for (let i = 0; i < recent.form.length; i++) {
        const formType = recent.form[i];
        
        if (formTypes.includes(formType)) {
          const accessionNumber = recent.accessionNumber[i].replace(/-/g, '');
          const primaryDocument = recent.primaryDocument[i];
          
          // Construct filing URL
          const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber}/${primaryDocument}`;
          
          return {
            formType,
            filingDate: recent.filingDate[i],
            filingUrl,
            cik,
          };
        }
      }

      console.log(`No ${formTypes.join(' or ')} filing found for ticker: ${ticker}`);
      return null;
    } catch (error) {
      console.error(`Error fetching latest filing for ticker ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Fetch the full text content of a filing
   */
  async getFilingContent(filingUrl: string): Promise<string | null> {
    try {
      await this.rateLimit();
      
      const response = await axios.get(filingUrl, {
        headers: { 'User-Agent': this.userAgent },
        responseType: 'text'
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching filing content from ${filingUrl}:`, error);
      return null;
    }
  }

  /**
   * Extract specific sections from filing HTML
   * This is a basic extraction - could be enhanced with sec-api.io for better parsing
   */
  extractSections(htmlContent: string): {
    managementDiscussion: string | null;
    riskFactors: string | null;
    businessOverview: string | null;
  } {
    // Remove HTML tags for basic text extraction
    const cleanText = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Try to extract sections by searching for common headers
    const mdaMatch = htmlContent.match(/(?:item\s*7|management'?s?\s+discussion)/i);
    const riskMatch = htmlContent.match(/(?:item\s*1a|risk\s+factors)/i);
    const businessMatch = htmlContent.match(/(?:item\s*1[^a]|business\s+overview|description\s+of\s+business)/i);

    // Extract text chunks (limited to reasonable sizes for AI processing)
    const extractChunk = (startPos: number, maxLength: number = 15000): string => {
      if (startPos === -1) return '';
      const chunk = htmlContent.substring(startPos, startPos + maxLength);
      return cleanText(chunk).substring(0, 10000); // Limit to 10k chars for AI
    };

    return {
      managementDiscussion: mdaMatch ? extractChunk(mdaMatch.index || 0) : null,
      riskFactors: riskMatch ? extractChunk(riskMatch.index || 0) : null,
      businessOverview: businessMatch ? extractChunk(businessMatch.index || 0) : null,
    };
  }

  /**
   * Get comprehensive filing data for a ticker
   */
  async getCompanyFilingData(ticker: string): Promise<{
    cik: string;
    formType: string;
    filingDate: string;
    filingUrl: string;
    managementDiscussion: string | null;
    riskFactors: string | null;
    businessOverview: string | null;
  } | null> {
    try {
      // Get latest filing info
      const filing = await this.getLatestFiling(ticker);
      if (!filing) {
        return null;
      }

      // Fetch filing content
      const content = await this.getFilingContent(filing.filingUrl);
      if (!content) {
        return {
          ...filing,
          managementDiscussion: null,
          riskFactors: null,
          businessOverview: null,
        };
      }

      // Extract sections
      const sections = this.extractSections(content);

      return {
        ...filing,
        ...sections,
      };
    } catch (error) {
      console.error(`Error getting filing data for ticker ${ticker}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const secEdgarService = new SECEdgarService();
