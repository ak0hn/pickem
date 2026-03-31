'use client'

import { useState, useTransition } from 'react'
import { updateAnnouncement } from '@/app/actions/commissioner'
import { toggleReaction } from '@/app/actions/feed'
import Link from 'next/link'
import AnnouncementModal from './AnnouncementModal'
import SlateTable from './SlateTable'

function getTitle(type: string, weekNumber: number | null): string {
  const w = weekNumber ? ` ${weekNumber}` : ''
  switch (type) {
    case 'slate':          return `🏈 Week${w} Lines — Lock In Your Picks`
    case 'results':        return `🏆 Week${w} Results`
    case 'tiebreaker':     return '⚡ MNF Showdown'
    case 'pre_snf_update':
    case 'general':
    default:               return "📣 Commissioner's Corner"
  }
}

export default function AnnouncementCard({
  id,
  type,
  weekNumber,
  weekId,
  content,
  createdAt,
  isCommissioner,
  likeCount,
  hasLiked,
  commentCount,
}: {
  id: string
  type: string
  weekNumber: number | null
  weekId: string | null
  content: string
  createdAt: string
  isCommissioner: boolean
  likeCount: number
  hasLiked: boolean
  commentCount: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [editPending, startEditTransition] = useTransition()

  const [liked, setLiked] = useState(hasLiked)
  const [likes, setLikes] = useState(likeCount)
  const [likePending, startLikeTransition] = useTransition()

  const [modalOpen, setModalOpen] = useState(false)
  const [localCommentCount, setLocalCommentCount] = useState(commentCount)

  const title = getTitle(type, weekNumber)

  function handleSave() {
    if (!draft.trim() || draft.trim() === content) { setEditing(false); return }
    startEditTransition(async () => {
      await updateAnnouncement(id, draft.trim())
      setEditing(false)
    })
  }

  function handleCancel() {
    setDraft(content)
    setEditing(false)
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes((prev) => wasLiked ? prev - 1 : prev + 1)
    startLikeTransition(async () => {
      await toggleReaction(id, '👍')
    })
  }

  function openModal(e: React.MouseEvent) {
    // Don't open modal when in edit mode or clicking edit/save/cancel buttons
    if (editing) return
    setModalOpen(true)
  }

  return (
    <>
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 cursor-pointer active:bg-gray-800/80 transition-colors"
        onClick={openModal}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-white leading-snug">{title}</span>
          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            {isCommissioner && !editing && (
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                className="text-xs text-gray-600 active:text-gray-400 transition-colors"
              >
                Edit
              </button>
            )}
            <span className="text-xs text-gray-600">
              {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Body */}
        {editing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-gray-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={editPending || !draft.trim()}
                className="px-3 py-1.5 rounded-lg bg-blue-600 active:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {editPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={editPending}
                className="px-3 py-1.5 rounded-lg bg-gray-800 active:bg-gray-700 text-gray-400 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white leading-relaxed">{draft}</p>
        )}

        {/* Lines table — slate + tiebreaker only */}
        {(type === 'slate' || type === 'tiebreaker') && weekId && (
          <SlateTable weekId={weekId} isTiebreaker={type === 'tiebreaker'} />
        )}

        {/* Standings link — results only */}
        {type === 'results' && (
          <Link
            href="/standings"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-400 active:text-blue-300 font-medium transition-colors"
          >
            View standings ↗
          </Link>
        )}

        {/* Footer — likes + comments, right-aligned */}
        <div className="flex items-center justify-end gap-4 pt-3 mt-1 border-t border-gray-800">
          <div className="flex items-center gap-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {localCommentCount > 0 && <span className="text-xs">{localCommentCount}</span>}
          </div>

          <button
            onClick={handleLike}
            disabled={likePending}
            className={`flex items-center gap-1 transition-colors ${
              liked ? 'text-red-400' : 'text-gray-500 active:text-gray-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likes > 0 && <span className="text-xs">{likes}</span>}
          </button>
        </div>
      </div>

      {modalOpen && (
        <AnnouncementModal
          id={id}
          type={type}
          weekId={weekId}
          title={title}
          createdAt={createdAt}
          content={draft}
          likeCount={likes}
          hasLiked={liked}
          onLike={(e) => handleLike(e)}
          onClose={() => setModalOpen(false)}
          onCommentAdded={() => setLocalCommentCount((c) => c + 1)}
        />
      )}
    </>
  )
}
