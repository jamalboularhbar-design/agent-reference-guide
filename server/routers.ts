import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import {
  getDocuments, getDocumentBySlug, getDocumentCategories, getRelatedDocuments,
  getDocumentStats, createDocument, updateDocument, deleteDocument,
  rateDocument, getUserRating, incrementViewCount, getPopularDocuments,
  getReadingLists, createReadingList, addToReadingList, removeFromReadingList,
  getReadingListItems, deleteReadingList, bulkImportDocuments, saveSummary,
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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

    popular: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional().default(10) }))
      .query(async ({ input }) => {
        return getPopularDocuments(input.limit);
      }),

    // View count
    recordView: publicProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await incrementViewCount(input.slug);
        return { success: true };
      }),

    // Ratings
    rate: publicProcedure
      .input(z.object({ slug: z.string(), visitorId: z.string(), rating: z.enum(['up', 'down']) }))
      .mutation(async ({ input }) => {
        return rateDocument(input.slug, input.visitorId, input.rating);
      }),

    getUserRating: publicProcedure
      .input(z.object({ slug: z.string(), visitorId: z.string() }))
      .query(async ({ input }) => {
        return getUserRating(input.slug, input.visitorId);
      }),

    // AI Summary
    generateSummary: publicProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        const doc = await getDocumentBySlug(input.slug);
        if (!doc || !doc.content) throw new Error('Document not found');

        // If summary already exists, return it
        if (doc.summary) return { summary: doc.summary };

        // Generate summary using LLM
        const contentPreview = doc.content.substring(0, 4000);
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a concise summarizer. Generate a 2-3 sentence TL;DR summary of the following operational document. Focus on the key purpose, main processes, and critical outcomes. Keep it under 80 words." },
            { role: "user", content: `Document Title: ${doc.title}\nCategory: ${doc.category}\n\nContent:\n${contentPreview}` },
          ],
        });

        const summary = (response.choices?.[0]?.message?.content as string) || 'Summary unavailable.';
        await saveSummary(input.slug, summary);
        return { summary };
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

    bulkImport: adminProcedure
      .input(z.object({
        documents: z.array(z.object({
          title: z.string().min(1),
          category: z.string().min(1),
          content: z.string().min(1),
        })).min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        return bulkImportDocuments(input.documents);
      }),
  }),

  // Reading Lists
  readingLists: router({
    list: publicProcedure
      .input(z.object({ visitorId: z.string() }))
      .query(async ({ input }) => {
        return getReadingLists(input.visitorId);
      }),

    create: publicProcedure
      .input(z.object({ visitorId: z.string(), name: z.string().min(1).max(200), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        return createReadingList(input.visitorId, input.name, input.description);
      }),

    items: publicProcedure
      .input(z.object({ listId: z.number() }))
      .query(async ({ input }) => {
        return getReadingListItems(input.listId);
      }),

    addItem: publicProcedure
      .input(z.object({ listId: z.number(), documentSlug: z.string() }))
      .mutation(async ({ input }) => {
        return addToReadingList(input.listId, input.documentSlug);
      }),

    removeItem: publicProcedure
      .input(z.object({ listId: z.number(), documentSlug: z.string() }))
      .mutation(async ({ input }) => {
        return removeFromReadingList(input.listId, input.documentSlug);
      }),

    delete: publicProcedure
      .input(z.object({ listId: z.number() }))
      .mutation(async ({ input }) => {
        return deleteReadingList(input.listId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
