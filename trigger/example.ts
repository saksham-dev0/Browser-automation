import { logger, metadata, task, wait } from "@trigger.dev/sdk";

export const helloWorldTask = task({
  id: "hello-world",
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload: { workflowId: string; orgId: string }, { ctx }) => {
    logger.log("Hello, world!", { payload, ctx });

    metadata.set("status", "Starting").set("progress", 0);

    await wait.for({ seconds: 5 });

    metadata.set("status", "Finishing up").set("progress", 100);

    return {
      message: "Task completed successfully!",
    }
  },
});
