import OpenAI from 'openai'
import type { NewsArticle } from './newsapi'

export type SignalResult = {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number // 50–95
  reasoning: string
  headlines: string[] // top article titles used in the analysis
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a financial news analyst. Given a list of recent news headlines and descriptions about a specific asset, you will:
1. Assess the overall market sentiment (bullish, bearish, or neutral)
2. Generate a trading signal: BUY, SELL, or HOLD
3. Assign a confidence score between 50 and 95
4. Write a concise 1–2 sentence reasoning explaining the signal

Rules:
- Only output valid JSON, no prose before or after
- Base the signal purely on the news content provided
- If there are fewer than 3 articles or the news is ambiguous, lean toward HOLD with lower confidence
- Confidence reflects how clear and consistent the signal is across articles
- Reasoning must mention specific news themes or events, not generic statements`

export async function analyzeAndGenerateSignal(
  symbol: string,
  name: string,
  articles: NewsArticle[]
): Promise<SignalResult> {
  const articleText = articles
    .slice(0, 10)
    .map((a, i) => {
      const desc = a.description ? ` — ${a.description.slice(0, 200)}` : ''
      return `${i + 1}. [${a.source}] ${a.title}${desc}`
    })
    .join('\n')

  const userPrompt = `Asset: ${symbol} (${name})

Recent news articles (last 24 hours):
${articleText}

Respond with JSON only, using this exact shape:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": <number 50–95>,
  "reasoning": "<1–2 sentences>",
  "sentiment": "bullish" | "bearish" | "neutral"
}`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(raw) as {
    action?: string
    confidence?: number
    reasoning?: string
  }

  const action = (['BUY', 'SELL', 'HOLD'] as const).includes(parsed.action as 'BUY' | 'SELL' | 'HOLD')
    ? (parsed.action as 'BUY' | 'SELL' | 'HOLD')
    : 'HOLD'

  const confidence = typeof parsed.confidence === 'number'
    ? Math.min(95, Math.max(50, Math.round(parsed.confidence)))
    : 60

  const reasoning = typeof parsed.reasoning === 'string' && parsed.reasoning.length > 0
    ? parsed.reasoning
    : 'Insufficient news data to generate a high-confidence signal.'

  return {
    action,
    confidence,
    reasoning,
    headlines: articles.slice(0, 5).map((a) => a.title),
  }
}
