import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchNews } from '@/lib/newsapi'
import { analyzeAndGenerateSignal } from '@/lib/openai'

export async function POST(request: Request) {
  const { tickerId } = await request.json()

  if (!tickerId) {
    return NextResponse.json({ error: 'tickerId is required' }, { status: 400 })
  }

  const ticker = await prisma.ticker.findUnique({ where: { id: tickerId } })
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
  }

  // 1. Fetch news from NewsAPI
  let articles = await fetchNews(ticker.symbol, ticker.name, ticker.type)

  // 2. If no news found, generate a low-confidence HOLD signal
  if (articles.length === 0) {
    const signal = await prisma.signal.create({
      data: {
        tickerId,
        action: 'HOLD',
        confidence: 50,
        reasoning: `No recent news found for ${ticker.symbol} in the last 24 hours. Insufficient data for a directional signal.`,
      },
    })
    return NextResponse.json(signal, { status: 201 })
  }

  // 3. Run AI analysis
  const result = await analyzeAndGenerateSignal(ticker.symbol, ticker.name, articles)

  // 4. Save articles to DB (skip duplicates by URL)
  const existingRows = await prisma.article.findMany({
    where: { tickerId, url: { in: articles.map((a) => a.url) } },
    select: { url: true },
  })
  const existingUrls = new Set(existingRows.map((r: { url: string }) => r.url))

  const newArticles = articles.filter((a) => !existingUrls.has(a.url))
  if (newArticles.length > 0) {
    await prisma.article.createMany({
      data: newArticles.map((a) => ({
        tickerId,
        title: a.title,
        url: a.url,
        source: a.source,
        publishedAt: new Date(a.publishedAt),
      })),
    })
  }

  // 5. Save signal
  const signal = await prisma.signal.create({
    data: {
      tickerId,
      action: result.action,
      confidence: result.confidence,
      reasoning: result.reasoning,
    },
  })

  return NextResponse.json(signal, { status: 201 })
}
