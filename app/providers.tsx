'use client'

import { LeagueProvider } from '@/lib/league/store'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <LeagueProvider>{children}</LeagueProvider>
}
