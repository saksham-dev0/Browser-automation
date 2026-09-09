import type { Stagehand } from "@browserbasehq/stagehand"

const MAX_STEPS = 20

export async function agent({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  // No model given, so the agent runs on Browserbase's Model Gateway under the
  // same key as the session — and every step it takes (agent:act,
  // agent:fillForm, agent:done) is recorded server-side, which is what makes it
  // show up in the session inspector.
  const runner = stagehand.agent()

  const result = await runner.execute({
    instruction,
    maxSteps: MAX_STEPS,
  })

  return {
    success: result.success,
    message: result.message,
    completed: result.completed,
  }
}
