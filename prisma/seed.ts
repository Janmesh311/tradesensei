import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
]

const REASONING = {
  BUY: [
    'Strong positive sentiment detected across 12 news sources. Earnings beat expectations by 8%.',
    'Bullish momentum building with multiple analyst upgrades in the last 24h.',
    'Positive earnings surprise with revenue above consensus by 6.4%. Forward guidance raised.',
  ],
  SELL: [
    'Negative sentiment surge across major news sources. Revenue guidance cut, margin pressure mounting.',
    'Multiple risk factors flagged: regulatory headwinds, insider selling detected.',
    'Earnings miss combined with lowered forward guidance. Three analysts downgraded the stock today.',
  ],
  HOLD: [
    'Mixed signals across sources. No strong directional catalyst detected in recent news flow.',
    'Balanced bullish/bearish coverage with no dominant trend. Confidence too low to commit.',
    'Price in consolidation zone. Sentiment neutral; awaiting breakout confirmation.',
  ],
} as const

type Action = keyof typeof REASONING

function mockSignal(): { action: Action; confidence: number; reasoning: string } {
  const actions: Action[] = ['BUY', 'SELL', 'HOLD']
  const action = actions[Math.floor(Math.random() * actions.length)]
  const reasons = REASONING[action]
  const reasoning = reasons[Math.floor(Math.random() * reasons.length)]
  const confidence = Math.floor(Math.random() * 46) + 50
  return { action, confidence, reasoning }
}

async function main() {
  console.log('Seeding TradeSensei database...\n')

  for (const t of TICKERS) {
    const ticker = await prisma.ticker.upsert({
      where: { symbol: t.symbol },
      update: {},
      create: t,
    })

    const { action, confidence, reasoning } = mockSignal()

    await prisma.signal.create({
      data: { tickerId: ticker.id, action, confidence, reasoning },
    })

    const color = action === 'BUY' ? '\x1b[32m' : action === 'SELL' ? '\x1b[31m' : '\x1b[90m'
    const reset = '\x1b[0m'
    console.log(`  ${ticker.symbol.padEnd(6)} ${color}${action.padEnd(5)}${reset} ${confidence}%  —  ${ticker.name}`)
  }

  console.log('\nDone! Database seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
