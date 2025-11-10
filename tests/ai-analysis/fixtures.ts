/**
 * Test Fixtures for AI Analysis Tests
 * Provides deterministic data for testing all AI analysis flows
 */

export const mockCompanyOverview = {
  Symbol: "AAPL",
  AssetType: "Common Stock",
  Name: "Apple Inc",
  Description: "Apple Inc. designs, manufactures, and markets smartphones",
  Exchange: "NASDAQ",
  Currency: "USD",
  Country: "USA",
  Sector: "TECHNOLOGY",
  Industry: "Computer Hardware",
  MarketCapitalization: "2500000000000",
  EBITDA: "125000000000",
  PERatio: "28.5",
  PEGRatio: "2.1",
  BookValue: "3.85",
  DividendPerShare: "0.92",
  DividendYield: "0.0052",
  EPS: "6.15",
  RevenuePerShareTTM: "25.50",
  ProfitMargin: "0.241",
  OperatingMarginTTM: "0.296",
  ReturnOnAssetsTTM: "0.199",
  ReturnOnEquityTTM: "1.565",
  RevenueTTM: "394000000000",
  GrossProfitTTM: "169000000000",
  DilutedEPSTTM: "6.15",
  QuarterlyEarningsGrowthYOY: "0.112",
  QuarterlyRevenueGrowthYOY: "0.021"
};

export const mockBalanceSheet = {
  symbol: "AAPL",
  annualReports: [{
    fiscalDateEnding: "2023-09-30",
    reportedCurrency: "USD",
    totalAssets: "352755000000",
    totalCurrentAssets: "143566000000",
    cashAndCashEquivalentsAtCarryingValue: "29965000000",
    totalLiabilities: "290437000000",
    totalCurrentLiabilities: "145308000000",
    longTermDebt: "98959000000",
    totalShareholderEquity: "62318000000",
    retainedEarnings: "-214000000",
    commonStock: "73812000000"
  }]
};

export const mockIncomeStatement = {
  symbol: "AAPL",
  annualReports: [{
    fiscalDateEnding: "2023-09-30",
    reportedCurrency: "USD",
    grossProfit: "169148000000",
    totalRevenue: "383285000000",
    costOfRevenue: "214137000000",
    costofGoodsAndServicesSold: "214137000000",
    operatingIncome: "114301000000",
    netIncome: "96995000000",
    ebit: "118658000000",
    ebitda: "130541000000",
    incomeBeforeTax: "119103000000"
  }]
};

export const mockCashFlow = {
  symbol: "AAPL",
  annualReports: [{
    fiscalDateEnding: "2023-09-30",
    reportedCurrency: "USD",
    operatingCashflow: "110543000000",
    cashflowFromInvestment: "-5923000000",
    cashflowFromFinancing: "-108488000000",
    changeInCash: "-3860000000",
    capitalExpenditures: "-10959000000",
    profitLoss: "96995000000"
  }]
};

export const mockDailyPrices = [
  { date: "2024-01-01", close: 185.50 },
  { date: "2024-01-02", close: 186.25 },
  { date: "2024-01-03", close: 187.10 }
];

export const mockTechnicalIndicators = {
  RSI: 58.5,
  MACD: { signal: "bullish", value: 2.5 },
  SMA50: 185.0,
  SMA200: 175.0,
  volatility: 0.25
};

export const mockNewsSentiment = {
  overallSentiment: 0.35,
  positiveMentions: 8,
  negativeMentions: 2,
  articles: [
    { title: "Apple launches new product", sentiment: 0.8, date: "2024-01-01" }
  ]
};

export const mockSECFilings = {
  formType: "10-K",
  filingDate: "2023-11-01",
  filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193",
  cik: "0000320193",
  managementDiscussion: "Management believes the Company is well-positioned for growth...",
  riskFactors: "The Company faces risks related to supply chain disruptions...",
  businessOverview: "Apple Inc. designs, manufactures, and markets smartphones, personal computers..."
};

export const mockComprehensiveFundamentals = {
  marketCap: "$2.5T",
  peRatio: 28.5,
  pegRatio: 2.1,
  profitMargin: 0.241,
  returnOnEquity: 1.565,
  debtToEquity: 1.59,
  currentRatio: 0.99,
  totalRevenue: "$383.3B",
  grossProfit: "$169.1B",
  netIncome: "$97.0B",
  operatingCashflow: "$110.5B",
  freeCashFlow: "$99.5B",
  totalAssets: "$352.8B",
  totalLiabilities: "$290.4B"
};

export const mockMicroAnalysis = {
  ticker: "AAPL",
  overallRating: "buy" as const,
  confidenceScore: 78,
  summary: "Strong fundamentals with solid growth prospects",
  financialHealth: {
    score: 82,
    strengths: ["Strong cash flow", "High profit margins"],
    weaknesses: ["High debt-to-equity ratio"],
    redFlags: []
  },
  technicalAnalysis: {
    score: 75,
    trend: "bullish" as const,
    momentum: "moderate" as const,
    signals: ["RSI neutral", "MACD bullish crossover"]
  },
  sentimentAnalysis: {
    score: 72,
    trend: "positive" as const,
    newsVolume: "high" as const,
    key_themes: ["Product launches", "Market expansion"]
  },
  keyMetrics: {
    profitability: "Excellent",
    liquidity: "Good",
    leverage: "Moderate",
    growth: "Strong"
  },
  risks: ["Supply chain dependencies", "Regulatory scrutiny"],
  opportunities: ["Services growth", "New markets"],
  recommendation: "BUY - Strong fundamentals support current valuation",
  analyzedAt: new Date().toISOString()
};

export const mockMacroAnalysis = {
  id: "macro-123",
  industry: "Computer Hardware",
  macroScore: 65,
  macroFactor: "0.95",
  recommendation: "neutral" as const,
  marketCondition: "mixed signals",
  marketPhase: "mid-cycle",
  riskAppetite: "moderate",
  keyThemes: ["Fed tightening", "Tech sector consolidation"],
  opportunities: ["AI adoption", "Cloud transition"],
  risks: ["Rising interest rates", "Economic slowdown"],
  summary: "Market conditions are moderately favorable for technology stocks",
  createdAt: new Date()
};

export const mockMacroAnalysisGeneral = {
  ...mockMacroAnalysis,
  id: "macro-general",
  industry: null,
  macroFactor: "1.0"
};

export const mockAnalysisJob = {
  id: "job-123",
  ticker: "AAPL",
  source: "onboarding" as const,
  priority: "normal" as const,
  status: "pending" as const,
  retryCount: 0,
  maxRetries: 3,
  scheduledAt: new Date(),
  createdAt: new Date()
};
