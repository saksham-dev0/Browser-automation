import { neon } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"

import * as schema from "./schema"

type Database = NeonHttpDatabase<typeof schema>

let instance: Database | undefined

/**
 * Built on first query, not at import. Next evaluates every server module while
 * collecting page data at build time, and a build machine has no reason to hold
 * a working `DATABASE_URL` — connecting eagerly turns a missing or malformed
 * value into a build failure instead of a runtime one.
 */
function getDb(): Database {
  if (instance) return instance

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }

  // Pooled connection over HTTP: one round trip per query, no socket to keep
  // alive. Suits per-request serverless invocations.
  instance = drizzle(neon(connectionString), { schema })

  return instance
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb()
    const value = Reflect.get(database, property)

    // Drizzle's builders read `this`, so hand back a bound method rather than a
    // detached function.
    return typeof value === "function" ? value.bind(database) : value
  },
})

export * from "./schema"
