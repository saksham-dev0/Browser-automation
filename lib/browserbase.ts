import Browserbase from "@browserbasehq/sdk"

/**
 * The core Browserbase SDK — session recordings, replays, live views and logs
 * live here, not in Stagehand. Uses the secret API key, so this module must
 * only ever be imported from server code.
 */
export const browserbase = new Browserbase({
  apiKey: process.env.BROWSERBASE_API_KEY!,
})
