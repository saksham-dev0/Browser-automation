import DodoPayments from "dodopayments"

let instance: DodoPayments | undefined

/**
 * Built on first use, not at import — same reason as `lib/db`: build-time page
 * data collection loads this module, and the key only has to exist at runtime.
 */
function getDodo(): DodoPayments {
  if (instance) return instance

  const bearerToken = process.env.DODO_PAYMENTS_API_KEY
  if (!bearerToken) {
    throw new Error("DODO_PAYMENTS_API_KEY is not set")
  }

  // `environment` is a narrow union while env vars are `string | undefined`, so
  // narrow explicitly and fall back to test mode — a missing or misspelled
  // variable must never reach live and charge a real card.
  const environment =
    process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
      ? "live_mode"
      : "test_mode"

  instance = new DodoPayments({
    bearerToken,
    environment,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
  })

  return instance
}

export const dodo = new Proxy({} as DodoPayments, {
  get(_target, property) {
    const client = getDodo()
    const value = Reflect.get(client, property)

    return typeof value === "function" ? value.bind(client) : value
  },
})
