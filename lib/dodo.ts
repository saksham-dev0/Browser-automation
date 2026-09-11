import DodoPayments from "dodopayments"

if (!process.env.DODO_PAYMENTS_API_KEY) {
  throw new Error("DODO_PAYMENTS_API_KEY is not set")
}

// `environment` is a narrow union while env vars are `string | undefined`, so
// narrow explicitly and fall back to test mode — a missing or misspelled
// variable must never reach live and charge a real card.
const environment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode"

export const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment,
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
})
