@AGENTS.md

# TradeSensei - AI-Powered Trading Signal Bot

## What this is
TradeSensei is a news-driven trading signal web app. It monitors real-time news and social sentiment across multiple sources, runs AI analysis on each article, and generates BUY/SELL/HOLD signals with confidence scores for stocks, ETFs, and crypto.

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS for styling
- Prisma + SQLite for database
- OpenAI API for sentiment analysis
- Alpaca Markets API for stock/ETF price data
- CoinGecko API for crypto prices
- NewsAPI for news ingestion

## Project Structure
- `app/` - All pages and API routes
- `app/page.tsx` - Main dashboard (watchlist + signals)
- `app/api/` - Backend API routes
- `prisma/` - Database schema
- `lib/` - Shared utilities and API clients

## Core Features (v1)
1. Watchlist - user adds tickers (AAPL, BTC, SPY etc)
2. News ingestion - fetch news per ticker every 15 mins
3. AI scoring - each article gets sentiment + relevance score
4. Signal engine - aggregates scores into BUY/SELL/HOLD + confidence %
5. Dashboard - signal cards per ticker with reasoning and source headlines

## Design
- Dark theme always
- Clean, minimal, data-dense
- Color coding: green for BUY, red for SELL, gray for HOLD

## Important Notes
- Never commit API keys - use .env.local
- All API keys go in .env.local (never .env)
- Keep components small and reusable
- TypeScript strict mode on

