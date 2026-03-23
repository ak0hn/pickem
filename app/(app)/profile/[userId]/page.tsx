export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Profile</h1>
      <p className="text-gray-400 mt-2">User: {userId}</p>
    </div>
  )
}
