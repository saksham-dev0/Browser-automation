import { Liveblocks, LiveblocksError } from "@liveblocks/node"

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})

/**
 * ID token auth requires rooms to exist with explicit permissions — a room that
 * was never created is private, and joining it fails with code 4001. The org's
 * Clerk ID is used as the group ID, matching `groupIds` in the auth endpoint.
 */
export async function getOrCreateWorkflowRoom({
  roomId,
  orgId,
  title,
}: {
  roomId: string
  orgId: string
  title: string
}) {
  try {
    return await liveblocks.getOrCreateRoom(roomId, {
      // Private by default: only the owning org's members can join
      organizationId: orgId,
      defaultAccesses: [],
      groupsAccesses: {
        [orgId]: ["room:write"],
      },
      metadata: { title },
    })
  } catch (error) {
    if (error instanceof LiveblocksError) {
      console.error(
        `Error getting or creating room ${roomId}: ${error.status} - ${error.message}`
      )
    } else {
      console.error(`Unexpected error creating room ${roomId}:`, error)
    }

    return null
  }
}

/**
 * Removes the room backing a workflow. A room that was never created (404) is
 * already in the desired state, so it is not treated as a failure.
 */
export async function deleteWorkflowRoom(roomId: string) {
  try {
    await liveblocks.deleteRoom(roomId)
  } catch (error) {
    if (error instanceof LiveblocksError) {
      if (error.status === 404) return

      console.error(
        `Error deleting room ${roomId}: ${error.status} - ${error.message}`
      )
    } else {
      console.error(`Unexpected error deleting room ${roomId}:`, error)
    }

    throw error
  }
}
