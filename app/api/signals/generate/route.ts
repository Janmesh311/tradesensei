import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ACTIONS = ['BUY', 'SELL', 'HOLD'] as const

const REASONING: Record<typeof ACTIONS[number], string[]> = {
  BUY: [
    'Strong positive sentiment detected across 12 news sources. Earnings beat expectations by 8%.',
    'Bullish momentum building with multiple analyst upgrades. Price target raised by three major firms in the last 24h.',
    'Volume spike detected alongside positive news flow. Institutional accumulation pattern observed in recent sessions.',
    'Macro tailwinds aligned with sector rotation into growth. Sentiment index hit 3-month high.',
    'Positive earnings surprise with revenue above consensus by 6.4%. Forward guidance raised.',
  ],
  SELL: [
    'Negative sentiment surge across major news sources. Revenue guidance cut, margin pressure mounting.',
    'Bearish divergence detected — price at resistance while sentiment deteriorates. Sector rotation out of growth.',
    'Multiple risk factors flagged: regulatory headwinds, insider selling detected, short interest rising.',
    'Earnings miss combined with lowered forward guidance. Three analysts downgraded the stock today.',
    'Macro headwinds increasing. Credit conditions tightening; historically negative for this asset class.',
  ],
  HOLD: [
    'Mixed signals across sources. No strong directional catalyst detected in recent news flow.',
    'Market uncertainty elevated. Conflicting data points — awaiting clearer signal before positioning.',
    'Balanced bullish/bearish news coverage with no dominant trend. Confidence too low to commit.',
    'Price in consolidation zone. Sentiment neutral; recommend waiting for breakout confirmation.',
    'Insufficient data for high-confidence signal. News volume low for this ticker in the past 24h.',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST(request: Request) {
  const { tickerId } = await request.json()

  if (!tickerId) {
    return NextResponse.json({ error: 'tickerId is required' }, { status: 400 })
  }

  const action = pick(ACTIONS)
  const confidence = Math.floor(Math.random() * 46) + 50 // 50–95
  const reasoning = pick(REASONING[action])

  const signal = await prisma.signal.create({
    data: { tickerId, action, confidence, reasoning },
  })

  return NextResponse.json(signal, { status: 201 })
}
