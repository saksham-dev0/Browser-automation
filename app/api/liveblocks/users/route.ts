import { auth, clerkClient } from "@clerk/nextjs/server"

// Clerk's user list filters accept at most 100 IDs per request
const MAX_USER_IDS = 100

type ResolvedUser = {
  name: string
  avatar: string
}

/**
 * Resolves Liveblocks user IDs (Clerk user IDs) to display info for
 * `resolveUsers` in `LiveblocksProvider`. Returns one entry per requested ID,
 * in the same order, with `null` for IDs that can't be resolved.
 */
export async function POST(request: Request) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const userIds = (body as { userIds?: unknown })?.userIds

  if (
    !Array.isArray(userIds) ||
    userIds.some((id) => typeof id !== "string" || id.length === 0)
  ) {
    return Response.json(
      { error: "userIds must be an array of strings" },
      { status: 400 }
    )
  }

  if (userIds.length > MAX_USER_IDS) {
    return Response.json(
      { error: `userIds must contain at most ${MAX_USER_IDS} IDs` },
      { status: 400 }
    )
  }

  if (userIds.length === 0) {
    return Response.json([])
  }

  // Dedupe so repeated IDs don't eat into the 100-ID filter limit
  const uniqueUserIds = [...new Set(userIds as string[])]

  const client = await clerkClient()

  // Scoped to the caller's org: IDs outside it resolve to null rather than
  // leaking names and avatars of unrelated users
  const { data: users } = await client.users.getUserList({
    userId: uniqueUserIds,
    organizationId: [orgId],
    limit: MAX_USER_IDS,
  })

  const usersById = new Map<string, ResolvedUser>(
    users.map((user) => [
      user.id,
      {
        name:
          user.fullName ??
          user.username ??
          user.primaryEmailAddress?.emailAddress ??
          "Anonymous",
        avatar: user.imageUrl,
      },
    ])
  )

  // Same length and order as the requested IDs, null for unknown users
  const resolved = (userIds as string[]).map(
    (id) => usersById.get(id) ?? null
  )

  return Response.json(resolved)
}
