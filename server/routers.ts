import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { getDocuments, getDocumentBySlug, getDocumentCategories, getRelatedDocuments, getDocumentStats, createDocument, updateDocument, deleteDocument } from "./db";

export const appRouter = router({
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

    // Admin CRUD operations
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        category: z.string().min(1).max(100),
        content: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const slug = input.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `ARG-Builder-${slug}.md`;
        const wordCount = input.content.split(/\s+/).filter(Boolean).length;
        return createDocument({ slug, title: input.title, category: input.category, filename, content: input.content, wordCount });
      }),

    update: adminProcedure
      .input(z.object({
        slug: z.string(),
        title: z.string().min(1).max(500).optional(),
        category: z.string().min(1).max(100).optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { slug, ...data } = input;
        return updateDocument(slug, data);
      }),

    delete: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        return deleteDocument(input.slug);
      }),
  }),
});

export type AppRouter = typeof appRouter;
