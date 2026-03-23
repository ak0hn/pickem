export default function WeekLoading() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 bg-gray-800 rounded-lg w-32 animate-pulse" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
