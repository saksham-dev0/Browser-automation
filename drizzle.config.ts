import { defineConfig } from "drizzle-kit"

// drizzle-kit runs outside Next.js, so `.env.local` is not loaded for us.
if (!process.env.DATABASE_URL_UNPOOLED) {
    process.loadEnvFile(".env.local")
}

export default defineConfig({
    dialect: "postgresql",
    schema: "./lib/db/schema/index.ts",
    out: "./lib/db/migrations",
    dbCredentials: {
        // Migrations must use a direct (non-pooled) connection.
        url: process.env.DATABASE_URL_UNPOOLED!,
    },
    strict: true,
    verbose: true,
})
