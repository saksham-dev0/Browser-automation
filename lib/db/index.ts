import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
}

// Pooled connection over HTTP: one round trip per query, no socket to keep
// alive. Suits per-request serverless invocations.
const sql = neon(process.env.DATABASE_URL)

export const db = drizzle(sql, { schema })

export * from "./schema"
