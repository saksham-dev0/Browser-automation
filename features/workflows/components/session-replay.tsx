"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircleIcon, LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// How long to wait between polls while Browserbase is still assembling the
// recording. It usually lands within a few seconds of the session closing.
const POLL_INTERVAL_MS = 2000

type ReplayState =
  | { status: "pending" }
  | { status: "ready" }
  | { status: "error"; message: string }

/**
 * Plays a Browserbase session recording.
 *
 * The playlist comes from `/api/replays/<sessionId>`, which proxies Browserbase
 * with the secret key. The recording lags the session close, so this polls that
 * route while it answers 202 and only attaches a player once a playlist comes
 * back.
 */
export function SessionReplay({
  sessionId,
  className,
}: {
  sessionId: string
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<ReplayState>({ status: "pending" })

  const src = `/api/replays/${encodeURIComponent(sessionId)}`

  // Pointing the component at another session starts over: drop the old
  // playlist during render rather than showing it while the new one loads.
  const [polledSrc, setPolledSrc] = useState(src)
  if (polledSrc !== src) {
    setPolledSrc(src)
    setState({ status: "pending" })
  }

  // Poll until the recording exists. Aborting on unmount stops both the
  // in-flight request and the retry loop.
  useEffect(() => {
    const controller = new AbortController()
    let retry: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      try {
        const response = await fetch(src, { signal: controller.signal })

        if (response.status === 202) {
          retry = setTimeout(poll, POLL_INTERVAL_MS)
          return
        }

        if (!response.ok) {
          setState({
            status: "error",
            message: `Replay unavailable (${response.status})`,
          })
          return
        }

        setState({ status: "ready" })
      } catch (error) {
        if (controller.signal.aborted) return

        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    void poll()

    return () => {
      controller.abort()
      clearTimeout(retry)
    }
  }, [src])

  // Attach a player once there is a playlist to load. hls.js is imported
  // lazily — it is a browser-only library and shouldn't weigh on the canvas
  // bundle for runs nobody replays.
  useEffect(() => {
    if (state.status !== "ready") return

    const video = videoRef.current
    if (!video) return

    let hls: import("hls.js").default | undefined
    let cancelled = false

    const attach = async () => {
      const { default: Hls } = await import("hls.js")
      if (cancelled || !videoRef.current) return

      // Safari plays HLS natively. Prefer hls.js where it works so playback
      // takes one code path, and fall back to the native player elsewhere.
      if (!Hls.isSupported()) {
        videoRef.current.src = src
        return
      }

      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Only fatal errors are worth surfacing — hls.js recovers from the
        // rest on its own.
        if (!data.fatal) return

        setState({
          status: "error",
          message: data.details ?? "Playback failed",
        })
      })
    }

    void attach()

    return () => {
      cancelled = true
      hls?.destroy()
    }
  }, [state.status, src])

  if (state.status === "error") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-destructive",
          className
        )}
      >
        <AlertCircleIcon className="size-4" />
        {state.message}
      </p>
    )
  }

  if (state.status === "pending") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          className
        )}
      >
        <LoaderIcon className="size-4 animate-spin" />
        Waiting for the recording&hellip;
      </p>
    )
  }

  return (
    <video
      ref={videoRef}
      controls
      muted
      playsInline
      className={cn("w-full rounded-md bg-black", className)}
    />
  )
}
