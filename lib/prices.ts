export type PriceData = {
  price: number | null
  changePercent: number | null
}

// Symbol → CoinGecko coin ID
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
}

async function fetchStockPrice(symbol: string): Promise<PriceData> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY
  if (!apiKey) return { price: null, changePercent: null }

  const url =
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return { price: null, changePercent: null }

  const data = await res.json()
  const quote = data?.['Global Quote']
  if (!quote?.['05. price']) return { price: null, changePercent: null }

  const rawChange = (quote['10. change percent'] as string | undefined)?.replace('%', '') ?? ''

  return {
    price: parseFloat(quote['05. price']),
    changePercent: rawChange ? parseFloat(rawChange) : null,
  }
}

async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, PriceData>> {
  const pairs = symbols
    .map((s) => ({ symbol: s, id: COINGECKO_IDS[s] }))
    .filter((p) => p.id)

  if (pairs.length === 0) return {}

  const ids = pairs.map((p) => p.id).join(',')
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return {}

  const data = await res.json()
  const result: Record<string, PriceData> = {}

  for (const { symbol, id } of pairs) {
    if (!data[id]) continue
    result[symbol] = {
      price: data[id].usd ?? null,
      changePercent: data[id].usd_24h_change ?? null,
    }
  }

  return result
}

export async function fetchPrices(
  tickers: Array<{ symbol: string; type: string }>
): Promise<Record<string, PriceData>> {
  const stocks = tickers.filter((t) => t.type === 'stock' || t.type === 'etf')
  const crypto = tickers.filter((t) => t.type === 'crypto')

  const results: Record<string, PriceData> = {}

  // Batch all crypto in one request
  if (crypto.length > 0) {
    try {
      const cryptoPrices = await fetchCryptoPrices(crypto.map((t) => t.symbol))
      Object.assign(results, cryptoPrices)
    } catch {
      for (const t of crypto) results[t.symbol] = { price: null, changePercent: null }
    }
  }

  // Stocks/ETFs fetched individually — Alpha Vantage free tier has no batch endpoint
  for (const t of stocks) {
    try {
      results[t.symbol] = await fetchStockPrice(t.symbol)
    } catch {
      results[t.symbol] = { price: null, changePercent: null }
    }
  }

  return results
}
