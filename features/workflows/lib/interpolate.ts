import { get } from "es-toolkit/compat"

// {{ nodeId.title }} / {{ nodeId.items[0].name }} — the whole placeholder body
// is a path into the run's outputs map, whose first segment is the node id.
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g

/**
 * Swaps every {{ path }} placeholder in a field's text for the value it points
 * at in this run's node outputs (keyed by node id). Nothing there — a missing
 * node, a missing key, null — becomes an empty string; objects and arrays are
 * dropped in as JSON. Pure: no db, no run context, so both the editor's preview
 * and the runner can call it.
 *
 * @example
 * interpolate("Hi {{ n1.title }}", { n1: { title: "Docs" } }); // "Hi Docs"
 */
export function interpolate(
  text: string,
  outputs: Record<string, unknown>
): string {
  return text.replace(PLACEHOLDER, (_match, path: string) => {
    const value = get(outputs, path)

    if (value === undefined || value === null) return ""
    if (typeof value === "object") return JSON.stringify(value)

    return String(value)
  })
}
