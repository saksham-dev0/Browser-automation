import { auth, currentUser } from "@clerk/nextjs/server"
import { liveblocks } from "@/lib/liveblocks"

export async function POST() {
  const { userId, orgId } = await auth()

  if (!userId) {
    return forbidden("Not signed in")
  }

  const user = await currentUser()

  if (!user) {
    return forbidden("User not found")
  }

  const name =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Anonymous"

  const { status, body } = await liveblocks.identifyUser(
    {
      userId,

      // Organization-scoped access: rooms grant permissions to this group ID
      groupIds: orgId ? [orgId] : [],
      organizationId: orgId,
    },
    {
      userInfo: {
        name,
        avatar: user.imageUrl,
      },
    }
  )

  return new Response(body, { status })
}

// Liveblocks stops retrying the auth endpoint when it receives this shape,
// instead of looping reconnection attempts for signed-out users
function forbidden(reason: string) {
  return Response.json({ error: "forbidden", reason }, { status: 403 })
}
