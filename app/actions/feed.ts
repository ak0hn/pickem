'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

export async function getAnnouncementComments(announcementId: string) {
  const db = createServiceClient()
  const { data } = await db
    .from('comments')
    .select('id, content, created_at, author:user_id(name)')
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true })
  return (data ?? []) as Array<{
    id: string
    content: string
    created_at: string
    author: { name: string } | null
  }>
}

export async function addComment(announcementId: string, content: string) {
  const user = await requireAuth()
  const db = createServiceClient()
  await db.from('comments').insert({ announcement_id: announcementId, user_id: user.id, content })
  revalidatePath('/home')
}

export async function getWeekGames(weekId: string, tiebreakerOnly: boolean) {
  const db = createServiceClient()
  const { data } = await db
    .from('games')
    .select('id, home_team, away_team, spread, spread_favorite, kickoff_time, is_tiebreaker')
    .eq('week_id', weekId)
    .eq('is_tiebreaker', tiebreakerOnly)
    .order('kickoff_time', { ascending: true })
  return data ?? []
}

export async function toggleReaction(announcementId: string, emoji: string) {
  const user = await requireAuth()
  const db = createServiceClient()
  const { data: existing } = await db
    .from('reactions')
    .select('id')
    .eq('announcement_id', announcementId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()
  if (existing) {
    await db.from('reactions').delete().eq('id', existing.id)
  } else {
    await db.from('reactions').insert({ announcement_id: announcementId, user_id: user.id, emoji })
  }
  revalidatePath('/home')
}
