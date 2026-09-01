/** A deliberately small, recognisable NSE universe. Quotes are always fetched per symbol. */
export const STOCK_UNIVERSE = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", sector: "Conglomerate" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", sector: "Financials" },
  { symbol: "INFY.NS", name: "Infosys", sector: "Technology" },
  { symbol: "ITC.NS", name: "ITC Ltd", sector: "Consumer" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors", sector: "Automotive" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", sector: "Technology" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical", sector: "Healthcare" },
  { symbol: "NIFTYBEES.NS", name: "Nippon India ETF Nifty BeES", sector: "Index ETF" },
] as const;

export const SUPPORTED_SYMBOLS: Set<string> = new Set(STOCK_UNIVERSE.map((stock) => stock.symbol));

export function getStock(symbol: string) {
  return STOCK_UNIVERSE.find((stock) => stock.symbol === symbol);
}
