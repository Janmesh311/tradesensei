'use client'

import { useState, useEffect, useCallback } from 'react'

type Signal = {
  id: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string
  createdAt: string
}

type Ticker = {
  id: string
  symbol: string
  name: string
  type: string
  signals: Signal[]
}

type PriceData = {
  price: number | null
  changePercent: number | null
}

const SIGNAL_STYLES = {
  BUY: {
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    dot: 'bg-green-400',
    bar: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-400',
  },
  SELL: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    dot: 'bg-red-400',
    bar: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-400',
  },
  HOLD: {
    text: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    dot: 'bg-zinc-500',
    bar: 'bg-zinc-500',
    badge: 'bg-zinc-700/50 text-zinc-400',
  },
}

const TYPE_STYLES: Record<string, string> = {
  stock: 'bg-blue-500/20 text-blue-400',
  etf: 'bg-purple-500/20 text-purple-400',
  crypto: 'bg-orange-500/20 text-orange-400',
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatPrice(price: number | null): string {
  if (price === null) return 'N/A'
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
}

function formatChange(changePercent: number | null): string {
  if (changePercent === null) return ''
  const sign = changePercent >= 0 ? '+' : ''
  return `${sign}${changePercent.toFixed(2)}%`
}

export default function Dashboard() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('stock')
  const [adding, setAdding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())

  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const [signalHistory, setSignalHistory] = useState<Record<string, Signal[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())

  const fetchTickers = useCallback(async () => {
    const res = await fetch('/api/tickers')
    const data: Ticker[] = await res.json()
    setTickers(data)
    setLastRefreshed(new Date())
    return data
  }, [])

  const fetchPrices = useCallback(async (tickerList: Ticker[]) => {
    if (tickerList.length === 0) return
    const param = tickerList.map((t) => `${t.symbol}:${t.type}`).join(',')
    try {
      const res = await fetch(`/api/prices?tickers=${encodeURIComponent(param)}`)
      const data = await res.json()
      setPrices(data)
    } catch {
      // fail silently — prices show N/A
    }
  }, [])

  useEffect(() => {
    fetchTickers()
      .then((data) => fetchPrices(data))
      .finally(() => setLoading(false))
  }, [fetchTickers, fetchPrices])

  async function toggleHistory(tickerId: string) {
    if (expandedHistory.has(tickerId)) {
      setExpandedHistory((prev) => { const s = new Set(prev); s.delete(tickerId); return s })
      return
    }
    setLoadingHistory((prev) => new Set(prev).add(tickerId))
    try {
      const res = await fetch(`/api/tickers/${tickerId}/signals`)
      const data: Signal[] = await res.json()
      setSignalHistory((prev) => ({ ...prev, [tickerId]: data }))
    } catch {
      setSignalHistory((prev) => ({ ...prev, [tickerId]: [] }))
    } finally {
      setLoadingHistory((prev) => { const s = new Set(prev); s.delete(tickerId); return s })
      setExpandedHistory((prev) => new Set(prev).add(tickerId))
    }
  }

  async function addTicker() {
    if (!symbol.trim() || !name.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase().trim(), name: name.trim(), type }),
      })
      const ticker = await res.json()
      await fetch('/api/signals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickerId: ticker.id }),
      })
      const data = await fetchTickers()
      await fetchPrices(data)
      setSymbol('')
      setName('')
      setType('stock')
      setShowAddForm(false)
    } finally {
      setAdding(false)
    }
  }

  async function refreshSignals() {
    if (tickers.length === 0) return
    setRefreshing(true)
    setRefreshingIds(new Set(tickers.map((t) => t.id)))
    try {
      await Promise.all(
        tickers.map((t) =>
          fetch('/api/signals/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickerId: t.id }),
          })
        )
      )
      const data = await fetchTickers()
      await fetchPrices(data)
      // Clear cached history so it reloads fresh on next expand
      setSignalHistory({})
      setExpandedHistory(new Set())
    } finally {
      setRefreshing(false)
      setRefreshingIds(new Set())
    }
  }

  const counts = tickers.reduce(
    (acc, t) => {
      const action = t.signals[0]?.action
      if (action) acc[action] = (acc[action] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 sticky top-0 backdrop-blur-sm" style={{ backgroundColor: 'rgba(10,10,10,0.9)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold tracking-tight">
              <span className="text-white">Trade</span>
              <span className="text-green-400">Sensei</span>
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
              AI-Powered Trade Intelligence
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="hidden sm:block text-xs text-zinc-700 font-mono">
                {timeAgo(lastRefreshed.toISOString())}
              </span>
            )}
            <button
              onClick={refreshSignals}
              disabled={refreshing || loading || tickers.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-zinc-800 text-zinc-400 rounded-lg hover:border-zinc-600 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span
                className="inline-block"
                style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
              >
                ↻
              </span>
              <span className="hidden sm:inline">
                {refreshing ? 'Refreshing...' : 'Refresh Signals'}
              </span>
            </button>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 transition-all font-semibold"
            >
              <span>{showAddForm ? '✕' : '+'}</span>
              <span>Add Ticker</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Add ticker form */}
        {showAddForm && (
          <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-3">
              Add to Watchlist
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Symbol</label>
                <input
                  type="text"
                  placeholder="AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                  maxLength={12}
                  className="w-28 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  placeholder="Apple Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTicker()}
                  className="w-52 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <button
                onClick={addTicker}
                disabled={adding || !symbol.trim() || !name.trim()}
                className="px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!loading && tickers.length > 0 && (
          <div className="flex items-center gap-5 mb-6 text-sm">
            <span className="text-zinc-600">
              <span className="text-white font-medium">{tickers.length}</span> tracked
            </span>
            {(counts.BUY ?? 0) > 0 && (
              <span className="text-zinc-600">
                <span className="text-green-400 font-medium">{counts.BUY}</span> BUY
              </span>
            )}
            {(counts.SELL ?? 0) > 0 && (
              <span className="text-zinc-600">
                <span className="text-red-400 font-medium">{counts.SELL}</span> SELL
              </span>
            )}
            {(counts.HOLD ?? 0) > 0 && (
              <span className="text-zinc-600">
                <span className="text-zinc-400 font-medium">{counts.HOLD}</span> HOLD
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-700">
            <div className="text-3xl mb-3 animate-pulse">◎</div>
            <div className="text-sm tracking-wider">Loading signals...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && tickers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="text-5xl mb-5 opacity-10">◈</div>
            <h3 className="text-zinc-300 font-semibold mb-1">Watchlist is empty</h3>
            <p className="text-zinc-600 text-sm mb-5 text-center">
              Add tickers to start receiving AI-generated signals
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition"
            >
              + Add First Ticker
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && tickers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickers.map((ticker) => {
              const signal = ticker.signals[0]
              const styles = signal ? SIGNAL_STYLES[signal.action] : SIGNAL_STYLES.HOLD
              const isRefreshing = refreshingIds.has(ticker.id)
              const priceData = prices[ticker.symbol]
              const historyOpen = expandedHistory.has(ticker.id)
              const historyLoading = loadingHistory.has(ticker.id)
              const history = signalHistory[ticker.id] ?? []

              return (
                <div
                  key={ticker.id}
                  className={`rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all duration-200 ${
                    isRefreshing ? 'opacity-50' : ''
                  }`}
                >
                  <div className="p-4">
                    {/* Symbol + type */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-base font-bold font-mono tracking-tight">{ticker.symbol}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          TYPE_STYLES[ticker.type] ?? 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {ticker.type}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="text-xs text-zinc-600 mb-3 truncate">{ticker.name}</div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xl font-bold font-mono tracking-tight">
                        {priceData ? formatPrice(priceData.price) : <span className="text-zinc-700">—</span>}
                      </span>
                      {priceData?.changePercent !== null && priceData?.changePercent !== undefined && (
                        <span
                          className={`text-xs font-mono font-semibold ${
                            priceData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatChange(priceData.changePercent)}
                        </span>
                      )}
                      {priceData === undefined && (
                        <span className="text-[10px] text-zinc-700">loading...</span>
                      )}
                    </div>

                    {signal ? (
                      <>
                        {/* Signal badge */}
                        <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg mb-2 ${styles.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
                          <span className={`text-sm font-bold tracking-widest ${styles.text}`}>
                            {signal.action}
                          </span>
                          <span className={`ml-auto text-sm font-mono font-bold ${styles.text}`}>
                            {signal.confidence}%
                          </span>
                        </div>

                        {/* Confidence bar */}
                        <div className="h-px bg-zinc-800 rounded-full mb-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${styles.bar}`}
                            style={{ width: `${signal.confidence}%` }}
                          />
                        </div>

                        {/* Reasoning — full text, no truncation */}
                        <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                          {signal.reasoning}
                        </p>

                        {/* Timestamp */}
                        <div className="text-[10px] text-zinc-700 font-mono mb-3">
                          {timeAgo(signal.createdAt)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-zinc-700 py-6 text-center mb-3">No signal yet</div>
                    )}

                    {/* History toggle */}
                    <button
                      onClick={() => toggleHistory(ticker.id)}
                      className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest py-1 border-t border-zinc-800 flex items-center justify-center gap-1.5"
                    >
                      {historyLoading ? (
                        <span>Loading...</span>
                      ) : (
                        <>
                          <span>{historyOpen ? '▲' : '▼'}</span>
                          <span>{historyOpen ? 'Hide' : 'History'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Signal history panel */}
                  {historyOpen && (
                    <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                      {history.length === 0 ? (
                        <p className="text-[11px] text-zinc-700 text-center py-2">No history yet</p>
                      ) : (
                        history.map((s, i) => {
                          const hs = SIGNAL_STYLES[s.action]
                          return (
                            <div key={s.id} className={`text-[11px] ${i > 0 ? 'border-t border-zinc-800/60 pt-3' : ''}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-bold tracking-widest text-[10px] px-1.5 py-0.5 rounded ${hs.badge}`}>
                                  {s.action}
                                </span>
                                <span className={`font-mono font-semibold ${hs.text}`}>{s.confidence}%</span>
                                <span className="text-zinc-700 font-mono ml-auto">{timeAgo(s.createdAt)}</span>
                              </div>
                              <p className="text-zinc-600 leading-relaxed">{s.reasoning}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
