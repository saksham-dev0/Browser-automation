import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY!)

/**
 * Verified sender. Override per-call when a workflow needs its own identity.
 * `onboarding@resend.dev` is the sandbox sender and only delivers to the
 * Resend account owner's address — set RESEND_FROM once a domain is verified.
 */
export const DEFAULT_FROM =
  process.env.RESEND_FROM ?? "Acme <onboarding@resend.dev>"

type SendEmailParams = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string | string[]
  /**
   * Dedupes retries for 24h. Format: `<event-type>/<entity-id>`. Reusing a key
   * with a different payload is a 409, so scope it to the exact send.
   */
  idempotencyKey?: string
}

/**
 * The SDK never throws on API errors — it returns `{ data, error }`. This wraps
 * that into a discriminated result so callers can't silently ignore a failure.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
  replyTo,
  idempotencyKey,
}: SendEmailParams) {
  const { data, error } = await resend.emails.send(
    {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )

  if (error) {
    console.error(`Error sending email "${subject}": ${error.message}`)

    return { id: null, error }
  }

  return { id: data!.id, error: null }
}
