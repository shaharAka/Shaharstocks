import axios from "axios";
import { rateLimit } from "../../utils/rateLimit";

export interface DailyForm4Entry {
  cik: string;
  companyName: string;
  formType: string;
  dateFiled: string;
  accessionNumber: string;
}

const SEC_BASE_URL = "https://data.sec.gov/submissions";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

// Rate limiter: 10 requests per second (SEC limit)
// We'll be conservative and use 8 requests per second to be safe
const secLimiter = rateLimit(8, 1000);

export class SecClient {
  private userAgent: string;

  constructor() {
    // SEC requires a specific User-Agent format: "Company Name AdminContact@company.com"
    const companyName = process.env.SEC_COMPANY_NAME || "signal2";
    const adminEmail = process.env.SEC_ADMIN_EMAIL || "shaharro@singnal2.studio";
    this.userAgent = `${companyName} ${adminEmail}`;
  }

  private async request<T>(url: string): Promise<T> {
    await secLimiter.wait();
    
    try {
      const response = await axios.get<T>(url, {
        headers: {
          "User-Agent": this.userAgent,
          "Accept-Encoding": "gzip, deflate",
          "Host": "data.sec.gov"
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`[SecClient] Error fetching ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetches the mapping of tickers to CIKs from the SEC.
   * This is a large JSON file containing all US public companies.
   */
  async getCompanyTickers(): Promise<any> {
    // Note: This endpoint is on www.sec.gov, not data.sec.gov
    await secLimiter.wait();
    try {
      const response = await axios.get(SEC_TICKERS_URL, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`[SecClient] Error fetching tickers:`, error.message);
      throw error;
    }
  }

  /**
   * Fetches company submissions (filings) by CIK.
   * @param cik Central Index Key (10-digit number, padded with zeros)
   */
  async getSubmissions(cik: string): Promise<any> {
    // Ensure CIK is 10 digits padded
    const paddedCik = cik.toString().padStart(10, "0");
    return this.request(`${SEC_BASE_URL}/CIK${paddedCik}.json`);
  }

  /**
   * Gets the index.json file for a filing, which lists all files in that filing directory.
   * This is the recommended way to find the actual XML file name.
   */
  async getFilingIndex(cik: string, accessionNumber: string): Promise<any> {
    const paddedCik = cik.toString().padStart(10, "0");
    const accessionNoDashes = accessionNumber.replace(/-/g, "");
    const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik)}/${accessionNoDashes}/index.json`;
    
    await secLimiter.wait();
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": this.userAgent
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`[SecClient] Error fetching index ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Downloads a specific filing document (e.g., the XML of a Form 4).
   * @param cik CIK
   * @param accessionNumber Accession number (unique ID of the filing)
   * @param primaryDocument Name of the primary document (usually ends in .xml)
   */
  async getFilingDocument(cik: string, accessionNumber: string, primaryDocument: string): Promise<string> {
    const paddedCik = cik.toString().padStart(10, "0");
    // Remove dashes from accession number for the URL path
    const accessionNoDashes = accessionNumber.replace(/-/g, "");
    
    const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik)}/${accessionNoDashes}/${primaryDocument}`;
    
    await secLimiter.wait();
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": this.userAgent
        },
        responseType: "text" // We want raw XML
      });
      return response.data;
    } catch (error: any) {
      console.error(`[SecClient] Error fetching document ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetches and parses the SEC EDGAR daily index for Form 4 filings.
   * @param date YYYYMMDD (e.g. "20241201") for the target day
   * @returns Entries with cik, companyName, formType, dateFiled, accessionNumber (from path)
   */
  async getDailyForm4Index(date: string): Promise<DailyForm4Entry[]> {
    // date is YYYYMMDD
    const year = date.slice(0, 4);
    const month = parseInt(date.slice(4, 6), 10);
    const qtr = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
    const url = `https://www.sec.gov/Archives/edgar/daily-index/${year}/QTR${qtr}/master.${date}.idx`;
    await secLimiter.wait();
    let body: string;
    try {
      const response = await axios.get(url, {
        headers: { "User-Agent": this.userAgent },
        responseType: "text",
      });
      body = response.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return [];
      console.error(`[SecClient] Error fetching daily index ${url}:`, e?.message);
      throw e;
    }
    // SEC: first 11 lines header, 12th optional column names, data from 13
    const lines = body.split(/\r?\n/).slice(11).filter(Boolean);
    const entries: DailyForm4Entry[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Tab- or multi-space delimited: Form | Company | CIK | Date | File
      const parts = trimmed.includes("\t")
        ? trimmed.split("\t")
        : trimmed.split(/\s{2,}/);
      const formType = (parts[0] || "").trim();
      if (formType !== "4") continue;
      const companyName = (parts[1] || "").trim();
      const cik = (parts[2] || "").replace(/\D/g, "").slice(0, 10).padStart(10, "0");
      const dateFiled = (parts[3] || "").trim();
      const filePath = (parts[4] || "").trim();
      if (!cik || !filePath) continue;
      // Extract accession from path like .../0001234567-24-000012/... or 000123456724000012
      const accMatch = filePath.match(/(\d{10})-?(\d{2})-?(\d{6})/);
      const accessionNumber = accMatch ? `${accMatch[1]}-${accMatch[2]}-${accMatch[3]}` : "";
      if (!accessionNumber) continue;
      entries.push({ cik, companyName, formType: "4", dateFiled, accessionNumber });
    }
    return entries;
  }

  /**
   * Fetches the RSS feed for latest filings.
   * This is used for real-time polling.
   */
  async getLatestFilingsRss(): Promise<string> {
    // RSS feed for Form 4 filings
    const url = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=only&start=0&count=40&output=atom";
    
    await secLimiter.wait();
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": this.userAgent
        },
        responseType: "text"
      });
      return response.data;
    } catch (error: any) {
      console.error(`[SecClient] Error fetching RSS feed:`, error.message);
      throw error;
    }
  }
}

export const secClient = new SecClient();
