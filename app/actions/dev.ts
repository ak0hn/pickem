'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { DayOfWeek } from '@/lib/league/types'

function devOnly() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Dev only')
}

// Always return most recent week regardless of status — dev tools need to move between states freely
async function getLatestWeekId(): Promise<string | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('weeks')
    .select('id')
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export type Scenario = 'wed' | 'thu_am' | 'thu_open' | 'thu_night' | 'sun_am' | 'sun_night' | 'mon' | 'closed'

type ScenarioCfg = {
  day: DayOfWeek
  status: string
  clearGames?: true
  thuHours?: number   // hours from now for thursday games
  otherHours?: number // hours from now for all non-thursday games
}

const SCENARIOS: Record<Scenario, ScenarioCfg> = {
  wed:       { day: 'Wed', status: 'pending',         clearGames: true                  },
  thu_am:    { day: 'Thu', status: 'pending',          thuHours:  +4,  otherHours: +52  },
  thu_open:  { day: 'Thu', status: 'open',             thuHours:  +2,  otherHours: +50  },
  thu_night: { day: 'Thu', status: 'open',             thuHours:  -3,  otherHours: +20  },
  sun_am:    { day: 'Sun', status: 'open',             thuHours: -50,  otherHours:  +1  },
  sun_night: { day: 'Sun', status: 'sunday_complete',  thuHours: -52,  otherHours:  -4  },
  mon:       { day: 'Mon', status: 'results_posted',   thuHours: -76,  otherHours: -28  },
  closed:    { day: 'Tue', status: 'closed',           thuHours: -100, otherHours: -52  },
}

export async function devSetScenario(scenario: Scenario): Promise<{ day: DayOfWeek }> {
  devOnly()
  const db = createServiceClient()
  const weekId = await getLatestWeekId()
  if (!weekId) return { day: 'Wed' }

  const cfg = SCENARIOS[scenario]
  const now = Date.now()
  const hr = 3_600_000

  await db.from('weeks').update({ status: cfg.status }).eq('id', weekId)

  if (cfg.clearGames) {
    await db.from('games').delete().eq('week_id', weekId).eq('is_tiebreaker', false)
  } else if (cfg.thuHours !== undefined && cfg.otherHours !== undefined) {
    await Promise.all([
      db.from('games')
        .update({ kickoff_time: new Date(now + cfg.thuHours * hr).toISOString() })
        .eq('week_id', weekId)
        .eq('day', 'thursday')
        .eq('is_tiebreaker', false),
      db.from('games')
        .update({ kickoff_time: new Date(now + cfg.otherHours * hr).toISOString() })
        .eq('week_id', weekId)
        .neq('day', 'thursday')
        .eq('is_tiebreaker', false),
    ])
  }

  return { day: cfg.day }
}
