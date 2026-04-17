import { NextResponse } from 'next/server'
import { fetchPrices } from '@/lib/prices'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('tickers') // e.g. "AAPL:stock,BTC:crypto"

  if (!raw) return NextResponse.json({})

  const tickers = raw
    .split(',')
    .map((s) => s.split(':'))
    .filter((p) => p.length === 2)
    .map(([symbol, type]) => ({ symbol, type }))

  try {
    const prices = await fetchPrices(tickers)
    return NextResponse.json(prices)
  } catch {
    return NextResponse.json({})
  }
}
