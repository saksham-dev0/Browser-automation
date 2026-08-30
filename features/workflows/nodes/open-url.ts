import type { Stagehand } from "@browserbasehq/stagehand"

export async function openUrl({
  stagehand,
  url,
}: {
  stagehand: Stagehand
  url: string
}) {
  const context = stagehand.browser.context
  const page = (await context.activePage()) ?? (await context.pages())[0]

  if (!page) {
    throw new Error("No open page available to navigate")
  }

  await page.goto(url, { waitUntil: "load", timeout: 30_000 })

  return { url: await page.url(), title: await page.title() }
}
