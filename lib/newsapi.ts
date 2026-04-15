export type NewsArticle = {
  title: string
  url: string
  source: string
  publishedAt: string
  description: string | null
}

/**
 * Builds a NewsAPI search query for a given ticker symbol and asset name.
 * Stocks/ETFs use the symbol + name; crypto uses just the name to avoid
 * matching unrelated ticker mentions.
 */
function buildQuery(symbol: string, name: string, type: string): string {
  if (type === 'crypto') {
    return name // e.g. "Bitcoin" or "Ethereum"
  }
  // For stocks/ETFs: symbol in quotes OR company name
  return `"${symbol}" OR "${name}"`
}

export async function fetchNews(
  symbol: string,
  name: string,
  type: string,
  pageSize = 10
): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) throw new Error('NEWSAPI_KEY is not set')

  const query = buildQuery(symbol, name, type)
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // yesterday

  const url = new URL('https://newsapi.org/v2/everything')
  url.searchParams.set('q', query)
  url.searchParams.set('from', from)
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('pageSize', String(pageSize))
  url.searchParams.set('language', 'en')
  url.searchParams.set('apiKey', apiKey)

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NewsAPI error ${res.status}: ${text}`)
  }

  const data = await res.json()

  if (data.status !== 'ok') {
    throw new Error(`NewsAPI returned status "${data.status}": ${data.message}`)
  }

  return (data.articles as Array<{
    title?: string
    url?: string
    source?: { name?: string }
    publishedAt?: string
    description?: string
  }>)
    .filter((a) => a.title && a.url && a.title !== '[Removed]')
    .map((a) => ({
      title: a.title!,
      url: a.url!,
      source: a.source?.name ?? 'Unknown',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      description: a.description ?? null,
    }))
}
