export default function ProfilePage({ params }: { params: { userId: string } }) {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Profile</h1>
      <p className="text-gray-400 mt-2">User: {params.userId}</p>
    </div>
  )
}
