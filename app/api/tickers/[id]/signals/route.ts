import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const signals = await prisma.signal.findMany({
    where: { tickerId: id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return NextResponse.json(signals)
}
