'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Player = { id: string; name: string }

export default function PlayerCombobox({ players }: { players: Player[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtered = query.trim() === ''
    ? players
    : players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(player: Player) {
    setQuery('')
    setOpen(false)
    router.push(`/commissioner/player/${player.id}`)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search players…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 active:text-gray-400 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto">
          {filtered.map((player) => (
            <button
              key={player.id}
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => handleSelect(player)}
              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-gray-800 active:bg-gray-700 transition-colors"
            >
              {player.name}
            </button>
          ))}
        </div>
      )}

      {open && query.trim() !== '' && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-600 shadow-xl">
          No players found
        </div>
      )}
    </div>
  )
}
