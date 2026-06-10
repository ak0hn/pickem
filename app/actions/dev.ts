'use server'

import { createServiceClient } from '@/lib/supabase/server'

function devOnly() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Dev actions only')
}

async function getActiveWeekId(): Promise<string | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('weeks')
    .select('id')
    .neq('status', 'closed')
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export async function devSetWeekStatus(status: string) {
  devOnly()
  const weekId = await getActiveWeekId()
  if (!weekId) return
  await createServiceClient().from('weeks').update({ status }).eq('id', weekId)
}

export async function devSetKickoffScenario(
  scenario: 'pre_thu' | 'post_thu' | 'pre_sun' | 'post_all'
) {
  devOnly()
  const weekId = await getActiveWeekId()
  if (!weekId) return

  const now = Date.now()
  const hr = 3_600_000
  const db = createServiceClient()

  // How many hours from now each day group's kickoff should be
  const cfg: Record<typeof scenario, { thursday: number; other: number }> = {
    pre_thu:  { thursday: +2,  other: +50 }, // Wed feel — everything open
    post_thu: { thursday: -2,  other: +22 }, // Thu night — TNF done, Sun open
    pre_sun:  { thursday: -50, other: +2  }, // Sun morning — games imminent
    post_all: { thursday: -52, other: -4  }, // Sun night — all games complete
  }

  const { thursday, other } = cfg[scenario]

  await Promise.all([
    db.from('games')
      .update({ kickoff_time: new Date(now + thursday * hr).toISOString() })
      .eq('week_id', weekId)
      .eq('day', 'thursday')
      .eq('is_tiebreaker', false),
    db.from('games')
      .update({ kickoff_time: new Date(now + other * hr).toISOString() })
      .eq('week_id', weekId)
      .neq('day', 'thursday')
      .eq('is_tiebreaker', false),
  ])
}
