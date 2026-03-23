export default function StandingsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-white">Standings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {['This Week', 'Season', 'History'].map((tab, i) => (
          <button
            key={tab}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === 0
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
        Standings coming soon.
      </div>
    </div>
  )
}
