'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/home':          'Feed',
  '/week':          'My Picks',
  '/standings':     'Standings',
  '/profile':       'Profile',
  '/settings':      'Settings',
  '/commissioner':  'Commissioner',
}

const STATUS_LABEL: Record<string, string> = {
  pending:         'Coming soon',
  open:            'Picks open',
  sunday_complete: 'Games in progress',
  tiebreaker:      'Tiebreaker',
  results_posted:  'Results posted',
}

const STATUS_COLOR: Record<string, string> = {
  pending:         'text-gray-400',
  open:            'text-green-400',
  sunday_complete: 'text-orange-400',
  tiebreaker:      'text-yellow-400',
  results_posted:  'text-blue-400',
}

export default function AppHeader({
  weekNumber,
  weekStatus,
}: {
  weekNumber: number | null
  weekStatus: string | null
}) {
  const pathname = usePathname()

  // Exact match first, then longest prefix match for main tabs
  const title = PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([route]) => pathname.startsWith(route + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    null

  const statusLabel = weekStatus ? STATUS_LABEL[weekStatus] : null
  const statusColor = weekStatus ? STATUS_COLOR[weekStatus] ?? 'text-gray-400' : ''

  return (
    <div className="sticky top-0 z-20 px-4 py-3 bg-black/95 backdrop-blur-sm border-b border-gray-800/60 flex items-center justify-between">
      <span className="text-xl font-bold text-white">{title ?? ''}</span>
      {weekNumber && statusLabel && (
        <span className={`text-sm font-semibold ${statusColor}`}>
          Week {weekNumber} · {statusLabel}
        </span>
      )}
    </div>
  )
}
