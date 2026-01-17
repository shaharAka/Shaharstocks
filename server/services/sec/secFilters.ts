import type { SecTransaction } from "./SecParser";

export interface OpenInsiderFilterConfig {
  insiderTitles?: string[] | null;
  minTransactionValue?: number | null;
  fetchPreviousDayOnly?: boolean;
  minMarketCap?: number;
  optionsDealThresholdPercent?: number;
}

export interface ApplyFiltersInput {
  tx: SecTransaction;
  quote: { currentPrice: number };
  companyInfo: { marketCap?: number } | null;
  config: OpenInsiderFilterConfig;
  /** Reference date for previousDayOnly; defaults to now. */
  refDate?: Date;
}

/**
 * Applies OpenInsider-style filters to an SEC Form 4 transaction.
 * Returns true if the transaction passes all configured filters.
 */
export function applyOpenInsiderFiltersToSecTransaction(input: ApplyFiltersInput): boolean {
  const { tx, quote, companyInfo, config, refDate = new Date() } = input;
  const minMarketCap = config.minMarketCap ?? 500;
  const optionsDealThreshold = config.optionsDealThresholdPercent ?? 15;

  // minMarketCap
  if (!companyInfo?.marketCap || companyInfo.marketCap < minMarketCap) {
    return false;
  }

  // minTransactionValue: (insiderPrice * transactionShares) >= minTransactionValue
  if (config.minTransactionValue != null && config.minTransactionValue > 0) {
    const value = tx.transactionPrice * tx.transactionShares;
    if (value < config.minTransactionValue) return false;
  }

  // previousDayOnly: transactionDate must be the previous calendar day
  if (config.fetchPreviousDayOnly) {
    const prev = new Date(refDate);
    prev.setUTCDate(prev.getUTCDate() - 1);
    const prevStr = prev.toISOString().slice(0, 10);
    if (tx.transactionDate !== prevStr) return false;
  }

  // optionsDealThreshold: if insiderPrice < (currentPrice * threshold/100), skip (options-like)
  if (optionsDealThreshold > 0 && tx.transactionCode === "P") {
    const threshold = optionsDealThreshold / 100;
    if (tx.transactionPrice < quote.currentPrice * threshold) {
      return false;
    }
  }

  // insiderTitles: allow if config is empty; otherwise must match
  const titles = config.insiderTitles;
  if (titles && titles.length > 0) {
    const lower = (s: string) => s.toLowerCase();
    const derived: string[] = [];
    if (tx.officerTitle) derived.push(tx.officerTitle);
    if (tx.isDirector) derived.push("director");
    if (tx.isOfficer) derived.push("officer");
    if (tx.isTenPercentOwner) derived.push("10% owner");
    const titleStr = derived.join(" ");
    const allowed = titles.some((t) => lower(titleStr).includes(lower(t)));
    if (!allowed) return false;
  }

  return true;
}

