import { createServiceClient } from '@/lib/supabase/server'

type Props = {
  weekId: string
}

export default async function SubmissionTracker({ weekId }: Props) {
  const db = createServiceClient()

  // Total active players
  const { count: totalPlayers } = await db
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'player')

  // Players who have submitted at least one pick this week
  const { data: submittedRaw } = await db
    .from('picks')
    .select('user_id')
    .eq('week_id', weekId)

  const submittedCount = new Set((submittedRaw ?? []).map((p) => p.user_id)).size
  const total = totalPlayers ?? 0
  const remaining = Math.max(0, total - submittedCount)
  const pct = total > 0 ? Math.round((submittedCount / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Pick submissions</span>
        <span className="text-sm font-semibold text-white">
          {submittedCount} <span className="text-gray-500 font-normal">/ {total}</span>
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {remaining === 0
          ? total > 0 ? 'Everyone is in 🎉' : 'No players yet'
          : `${remaining} player${remaining !== 1 ? 's' : ''} haven't picked yet`}
      </p>
    </div>
  )
}
