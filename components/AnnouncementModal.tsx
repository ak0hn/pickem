'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { getAnnouncementComments, addComment } from '@/app/actions/feed'
import SlateTable from './SlateTable'

type Comment = {
  id: string
  content: string
  created_at: string
  author: { name: string } | null
}

export default function AnnouncementModal({
  id,
  type,
  weekId,
  title,
  createdAt,
  content,
  likeCount,
  hasLiked,
  onLike,
  onClose,
  onCommentAdded,
}: {
  id: string
  type: string
  weekId: string | null
  title: string
  createdAt: string
  content: string
  likeCount: number
  hasLiked: boolean
  onLike: (e: React.MouseEvent) => void
  onClose: () => void
  onCommentAdded: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAnnouncementComments(id).then((data) => {
      setComments(data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleSubmit() {
    if (!draft.trim()) return
    const text = draft.trim()
    setDraft('')
    startTransition(async () => {
      await addComment(id, text)
      onCommentAdded()
      const updated = await getAnnouncementComments(id)
      setComments(updated)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const dateStr = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-gray-950 rounded-t-2xl flex flex-col max-h-[90dvh]">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Scrollable area */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {/* Post */}
          <div className="py-4 border-b border-gray-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-white leading-snug">{title}</span>
              <button onClick={onClose} className="text-gray-500 active:text-white shrink-0 text-xl leading-none pb-0.5">×</button>
            </div>
            <span className="text-xs text-gray-500">{dateStr}</span>
            <p className="text-sm text-white leading-relaxed">{content}</p>

            {/* Lines table — slate + tiebreaker only */}
            {(type === 'slate' || type === 'tiebreaker') && weekId && (
              <SlateTable weekId={weekId} isTiebreaker={type === 'tiebreaker'} />
            )}

            {/* Like button inside modal */}
            <div className="flex justify-end pt-1">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 transition-colors ${
                  hasLiked ? 'text-red-400' : 'text-gray-500 active:text-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={hasLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="pt-3 space-y-4">
            {loading ? (
              <p className="text-xs text-gray-600 text-center py-4">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No comments yet. Be the first.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-gray-300">{c.author?.name ?? 'Unknown'}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Comment input — pinned to bottom */}
        <div className="shrink-0 border-t border-gray-800 px-4 py-3 flex items-end gap-2 bg-gray-950 pb-[max(12px,env(safe-area-inset-bottom))]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment…"
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
            style={{ maxHeight: '96px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || pending}
            className="px-4 py-2.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors shrink-0"
          >
            {pending ? '…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
