import { defineContext, createPublicAPI } from "@deessejs/server";
import { deesse } from "@/lib/deesse";
import { z } from "zod";
import { ok } from "@deessejs/fp";

const { t } = defineContext({
  context: () => ({
    db: deesse.database,
    auth: deesse.auth,
  }),
});

const appRouter = t.router({
  greeting: {
    hello: t.query({
      args: z.object({ name: z.string().optional() }),
      handler: async (_ctx, args) => {
        const message = args.name ? `Hello, ${args.name}!` : "Hello, World!";
        return ok({ message });
      },
    }),
  },
});

export const publicAPI = createPublicAPI(appRouter);
export type AppRouter = typeof appRouter;