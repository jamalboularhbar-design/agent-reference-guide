import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDocuments, getDocumentBySlug, getDocumentCategories, getRelatedDocuments, getDocumentStats } from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  documents: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          search: z.string().optional(),
          sort: z.enum(['alpha', 'reading_time', 'newest']).optional().default('alpha'),
          limit: z.number().min(1).max(600).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
      )
      .query(async ({ input }) => {
        return getDocuments(input);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getDocumentBySlug(input.slug);
      }),

    categories: publicProcedure.query(async () => {
      return getDocumentCategories();
    }),

    related: publicProcedure
      .input(z.object({ slug: z.string(), category: z.string(), limit: z.number().min(1).max(10).optional().default(5) }))
      .query(async ({ input }) => {
        return getRelatedDocuments(input.slug, input.category, input.limit);
      }),

    stats: publicProcedure.query(async () => {
      return getDocumentStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
