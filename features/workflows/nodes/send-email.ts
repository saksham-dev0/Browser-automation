import { resend } from "@/lib/resend"

// The sandbox sender, which only delivers to the Resend account owner's own
// address. Swap it for a verified domain before this reaches real recipients.
const FROM = "onboarding@resend.dev"

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  // The SDK returns API failures on `error` rather than throwing, so a send
  // that never left Resend would otherwise mark this step done.
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    text: body,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return { emailId: data!.id }
}
