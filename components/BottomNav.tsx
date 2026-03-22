'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/home', label: 'Feed', icon: '🏠' },
  { href: '/week', label: 'Picks', icon: '🏈' },
  { href: '/standings', label: 'Standings', icon: '🏆' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 max-w-lg mx-auto">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
              pathname.startsWith(tab.href)
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
