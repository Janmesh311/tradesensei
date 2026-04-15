# TradeSensei

**AI-powered trading signal intelligence, driven by real-time news.**

TradeSensei monitors the latest news across stocks, ETFs, and crypto, runs each article through GPT-4o-mini sentiment analysis, and distills everything into a BUY / SELL / HOLD signal with a confidence score and plain-English reasoning — refreshed on demand.

---

## Tech Stack

- [Next.js 14](https://nextjs.org) — App Router, TypeScript
- [Tailwind CSS](https://tailwindcss.com) — dark-first styling
- [Prisma](https://prisma.io) + SQLite — local database
- [OpenAI API](https://platform.openai.com) — GPT-4o-mini for sentiment analysis
- [NewsAPI](https://newsapi.org) — real-time news ingestion

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Jamesh311/tradesensei.git
cd tradesensei
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL="file:./prisma/dev.db"
NEWSAPI_KEY=your_newsapi_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

- **NEWSAPI_KEY** — free tier available at [newsapi.org/register](https://newsapi.org/register)
- **OPENAI_API_KEY** — get yours at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Set up the database

```bash
npx prisma db push
```

### 4. Seed with starter tickers

```bash
npm run seed
```

This populates the database with AAPL, BTC, SPY, and NVDA.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Features (v1)

- **Watchlist** — add any stock ticker, ETF, or crypto asset
- **News ingestion** — fetches the last 24 hours of articles per ticker via NewsAPI
- **AI analysis** — GPT-4o-mini reads the headlines and generates a structured signal
- **Signal cards** — BUY / SELL / HOLD with confidence percentage and reasoning
- **On-demand refresh** — re-run analysis for all tickers with one click
- **Per-ticker refresh** — coming from the card (see below)
- **Article deduplication** — previously seen articles are not re-stored on refresh
- **No-news fallback** — gracefully returns a HOLD / 50% signal when no articles are found

---

## Coming Soon

- Per-card manual refresh button
- Price data overlay (Alpaca for stocks/ETFs, CoinGecko for crypto)
- Signal history chart per ticker
- Auto-refresh on a configurable interval (e.g. every 15 minutes)
- Email or browser push alerts on signal changes
- Filtering and sorting by signal type or confidence
- Multi-user watchlists with authentication
