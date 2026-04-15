import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const tickers = await prisma.ticker.findMany({
    include: {
      signals: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(tickers)
}

export async function POST(request: Request) {
  const { symbol, name, type } = await request.json()

  if (!symbol || !name || !type) {
    return NextResponse.json({ error: 'symbol, name, and type are required' }, { status: 400 })
  }

  const ticker = await prisma.ticker.create({
    data: {
      symbol: String(symbol).toUpperCase(),
      name: String(name),
      type: String(type),
    },
  })

  return NextResponse.json(ticker, { status: 201 })
}
