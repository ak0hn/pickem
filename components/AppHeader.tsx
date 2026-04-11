'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { getLogoUrl } from '@/lib/nfl-logos'

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


type LockedPick = { teamName: string; spread: string | null }

export default function AppHeader({
  weekNumber,
  weekStatus,
  lockedPicks,
  pickCount,
  hasActiveWeek,
}: {
  weekNumber: number | null
  weekStatus: string | null
  lockedPicks: LockedPick[]
  pickCount: number
  hasActiveWeek: boolean
}) {
  const pathname = usePathname()

  const title = PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([route]) => pathname.startsWith(route + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    null

  const statusLabel = weekStatus ? STATUS_LABEL[weekStatus] : null
  const statusColor = weekStatus ? STATUS_COLOR[weekStatus] ?? 'text-gray-400' : ''

  return (
    <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-gray-800/60">
      {/* Title row */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xl font-bold text-white">{title ?? ''}</span>
      </div>

      {/* Picks strip — avatars + status pill inline */}
      {hasActiveWeek && (
        <div className="px-4 pb-2.5 flex items-center gap-3">
          {/* Avatar slots */}
          <div className="flex gap-1.5">
            {Array.from({ length: pickCount }, (_, i) => {
              const pick = lockedPicks[i]
              const logo = pick ? getLogoUrl(pick.teamName) : null
              return (
                <div key={i}>
                  {logo ? (
                    <Image
                      src={logo}
                      alt={pick!.teamName}
                      width={22}
                      height={22}
                      unoptimized
                      className="rounded-full object-contain bg-white border border-gray-600"
                    />
                  ) : (
                    <div className="w-[22px] h-[22px] rounded-full bg-gray-800 border border-gray-700" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Status pill — inline with avatars */}
          {weekNumber && statusLabel && (
            <span className={`text-xs font-semibold ${statusColor}`}>
              Week {weekNumber} · {statusLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
