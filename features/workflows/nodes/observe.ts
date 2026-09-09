import type { Stagehand } from "@browserbasehq/stagehand"

export async function observe({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const actions = await stagehand.observe(instruction)

  // Drop `method`/`arguments` — a downstream node can only reference plain
  // values through {{ }}, and those two are only meaningful to act's replay.
  return {
    matches: actions.map(({ selector, description }) => ({
      selector,
      description,
    })),
  }
}
