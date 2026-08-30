import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_kxlodjwvvpksrujjrdgc",
  runtime: "node-24",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["features"],
  build: {
    // Stagehand ships its browser extension as files on disk (dist/assets/
    // stagehand-extension.zip, dist/extension/) and locates them relative to
    // import.meta.url. Bundling rewrites that URL to the build output, so the
    // extension upload to Browserbase fails with ENOENT. Keep the package
    // external so it is installed and resolved from node_modules at runtime.
    external: ["@browserbasehq/stagehand"],
  },
});
