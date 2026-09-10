import { auth } from "@clerk/nextjs/server"
import { APIError } from "@browserbasehq/sdk"

import { browserbase } from "@/lib/browserbase"

// Browserbase finishes writing a session's recording some time after the
// session itself closes. Until then the replay endpoints answer with one of
// these — the recording isn't gone, it just isn't assembled yet.
const NOT_READY_STATUSES = [202, 404, 409, 425]

/**
 * Proxies a session's HLS replay playlist. Fetching it needs the secret
 * Browserbase API key, which can never reach the browser, so the player points
 * at this route instead of api.browserbase.com.
 *
 * A session records one playlist per tab. `?page=<pageId>` picks one; the
 * default is the first, which is the tab the run drove.
 *
 * Returns the `.m3u8` body unchanged once the recording exists, or 202 with
 * `{ status: "pending" }` while it is still being assembled — the caller polls
 * until it flips. Segment URLs inside the playlist are pre-signed CDN links
 * that expire after six hours, so nothing here is cacheable.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/replays/[sessionId]">
) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const { sessionId } = await ctx.params
  const requestedPage = new URL(request.url).searchParams.get("page")

  try {
    const replay = await browserbase.sessions.replays.retrieve(sessionId)

    // A session whose recording hasn't landed yet can come back with no pages
    // at all rather than an error status.
    if (replay.pages.length === 0) {
      return pending()
    }

    const page = requestedPage
      ? replay.pages.find((candidate) => candidate.pageId === requestedPage)
      : replay.pages[0]

    if (!page) {
      return Response.json({ error: "page not found" }, { status: 404 })
    }

    const playlist = await browserbase.sessions.replays.retrievePage(
      sessionId,
      page.pageId
    )

    return new Response(await playlist.text(), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (
      error instanceof APIError &&
      NOT_READY_STATUSES.includes(error.status!)
    ) {
      return pending()
    }

    console.error(`Failed to load replay for session ${sessionId}`, error)

    return Response.json({ error: "replay unavailable" }, { status: 502 })
  }
}

// 202 rather than an error: the request was fine, the recording just isn't
// ready. The `pending` body is what the player polls on.
function pending() {
  return Response.json(
    { status: "pending" },
    { status: 202, headers: { "Cache-Control": "no-store" } }
  )
}
