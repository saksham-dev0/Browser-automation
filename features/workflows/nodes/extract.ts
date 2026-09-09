import type { Stagehand } from "@browserbasehq/stagehand"
import { z } from "zod/v4"

// The instruction is free-form, so the shape can't be known ahead of time — ask
// for one string and let the model format whatever it found into it.
const extractSchema = z.object({ result: z.string() })

export async function extract({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const { result } = await stagehand.extract(instruction, extractSchema)

  return { result }
}
