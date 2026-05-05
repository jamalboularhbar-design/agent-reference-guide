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
  logSearchQuery, logSearchClick, getPopularSearches, getSearchAnalyticsSummary,
  addTag, removeTag, getDocumentTags, getAllTags, getDocumentsByTag,
  addComment, getComments, deleteComment,
  saveDocumentVersion, getDocumentVersions, getDocumentVersionContent,
  pinDocument, unpinDocument, getPinnedDocuments,
  batchDeleteDocuments, batchUpdateStatus, batchAddTag,
  getCustomCategories, createCustomCategory, updateCustomCategory, deleteCustomCategory,
  getStaleDocuments, logDownload, getDownloadHistory,
  getActiveAnnouncements, getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  logActivity, getActivityLog,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

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
          status: z.enum(['draft', 'review', 'published', 'all']).optional().default('published'),
          tags: z.array(z.string()).optional(),
          minReadingTime: z.number().optional(),
          maxReadingTime: z.number().optional(),
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

    pinned: publicProcedure.query(async () => {
      return getPinnedDocuments();
    }),

    stale: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(20) }))
      .query(async ({ input }) => {
        return getStaleDocuments(input.limit);
      }),

    // View count
    recordView: publicProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await incrementViewCount(input.slug);
        await logActivity('view', input.slug);
        return { success: true };
      }),

    // Ratings
    rate: publicProcedure
      .input(z.object({ slug: z.string(), visitorId: z.string(), rating: z.enum(['up', 'down']) }))
      .mutation(async ({ input }) => {
        await logActivity('rate', input.slug, input.visitorId, input.rating);
        return rateDocument(input.slug, input.visitorId, input.rating);
      }),

    getUserRating: publicProcedure
      .input(z.object({ slug: z.string(), visitorId: z.string() }))
      .query(async ({ input }) => {
        return getUserRating(input.slug, input.visitorId);
      }),

    // Download tracking
    logDownload: publicProcedure
      .input(z.object({ slug: z.string(), format: z.string(), visitorId: z.string().optional() }))
      .mutation(async ({ input }) => {
        await logDownload(input.slug, input.format, input.visitorId);
        await logActivity('download', input.slug, input.visitorId, input.format);
        return { success: true };
      }),

    // AI Summary
    generateSummary: publicProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        const doc = await getDocumentBySlug(input.slug);
        if (!doc || !doc.content) throw new Error('Document not found');

        if (doc.summary) return { summary: doc.summary };

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
        status: z.enum(['draft', 'review', 'published']).optional().default('published'),
      }))
      .mutation(async ({ input }) => {
        const slug = input.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `ARG-Builder-${slug}.md`;
        const wordCount = input.content.split(/\s+/).filter(Boolean).length;
        const result = await createDocument({ slug, title: input.title, category: input.category, filename, content: input.content, wordCount, status: input.status });

        await notifyOwner({
          title: `New Document Created: ${input.title}`,
          content: `A new document "${input.title}" was created in the "${input.category}" category (${wordCount} words, status: ${input.status}).`,
        });

        await logActivity('create', slug, undefined, `Created: ${input.title}`);
        return result;
      }),

    update: adminProcedure
      .input(z.object({
        slug: z.string(),
        title: z.string().min(1).max(500).optional(),
        category: z.string().min(1).max(100).optional(),
        content: z.string().optional(),
        status: z.enum(['draft', 'review', 'published']).optional(),
        pinned: z.number().min(0).max(1).optional(),
        reviewBy: z.string().optional(),
        changeNote: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { slug, changeNote, reviewBy, ...data } = input;

        // Save version before updating
        const existing = await getDocumentBySlug(slug);
        if (existing && existing.content && (data.content || data.title)) {
          await saveDocumentVersion(slug, existing.title, existing.content, ctx.user?.name || 'admin', changeNote);
        }

        const updateData: any = { ...data };
        if (reviewBy !== undefined) {
          updateData.reviewBy = reviewBy ? new Date(reviewBy) : null;
        }

        await logActivity('update', slug, undefined, changeNote || `Updated document`);
        return updateDocument(slug, updateData);
      }),

    delete: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('delete', input.slug, undefined, `Deleted document`);
        return deleteDocument(input.slug);
      }),

    // Pinning
    pin: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('pin', input.slug);
        return pinDocument(input.slug);
      }),

    unpin: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('unpin', input.slug);
        return unpinDocument(input.slug);
      }),

    // Batch operations
    batchDelete: adminProcedure
      .input(z.object({ slugs: z.array(z.string()).min(1).max(100) }))
      .mutation(async ({ input }) => {
        await logActivity('batch_delete', undefined, undefined, `Deleted ${input.slugs.length} documents`);
        return batchDeleteDocuments(input.slugs);
      }),

    batchUpdateStatus: adminProcedure
      .input(z.object({ slugs: z.array(z.string()).min(1).max(100), status: z.enum(['draft', 'review', 'published']) }))
      .mutation(async ({ input }) => {
        await logActivity('batch_status', undefined, undefined, `Set ${input.slugs.length} docs to ${input.status}`);
        return batchUpdateStatus(input.slugs, input.status);
      }),

    batchAddTag: adminProcedure
      .input(z.object({ slugs: z.array(z.string()).min(1).max(100), tag: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        await logActivity('batch_tag', undefined, undefined, `Added tag "${input.tag}" to ${input.slugs.length} docs`);
        return batchAddTag(input.slugs, input.tag.toLowerCase().trim());
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
        const results = await bulkImportDocuments(input.documents);
        const successCount = results.filter(r => r.status === 'created').length;

        if (successCount > 0) {
          await notifyOwner({
            title: `Bulk Import: ${successCount} documents added`,
            content: `${successCount} new documents were imported successfully via bulk CSV upload.`,
          });
        }

        return results;
      }),

    // Document versions
    versions: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getDocumentVersions(input.slug);
      }),

    versionContent: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getDocumentVersionContent(input.id);
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

  // Search Analytics
  searchAnalytics: router({
    log: publicProcedure
      .input(z.object({ query: z.string(), resultCount: z.number(), visitorId: z.string().optional() }))
      .mutation(async ({ input }) => {
        await logSearchQuery(input.query, input.resultCount, input.visitorId);
        return { success: true };
      }),

    logClick: publicProcedure
      .input(z.object({ query: z.string(), clickedSlug: z.string(), visitorId: z.string().optional() }))
      .mutation(async ({ input }) => {
        await logSearchClick(input.query, input.clickedSlug, input.visitorId);
        return { success: true };
      }),

    popular: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(20) }))
      .query(async ({ input }) => {
        return getPopularSearches(input.limit);
      }),

    summary: adminProcedure.query(async () => {
      return getSearchAnalyticsSummary();
    }),
  }),

  // Document Tags
  tags: router({
    all: publicProcedure.query(async () => {
      return getAllTags();
    }),

    forDocument: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getDocumentTags(input.slug);
      }),

    documentsByTag: publicProcedure
      .input(z.object({ tag: z.string() }))
      .query(async ({ input }) => {
        return getDocumentsByTag(input.tag);
      }),

    add: publicProcedure
      .input(z.object({ documentSlug: z.string(), tag: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        return addTag(input.documentSlug, input.tag.toLowerCase().trim());
      }),

    remove: publicProcedure
      .input(z.object({ documentSlug: z.string(), tag: z.string() }))
      .mutation(async ({ input }) => {
        return removeTag(input.documentSlug, input.tag);
      }),
  }),

  // Document Comments
  comments: router({
    list: publicProcedure
      .input(z.object({ documentSlug: z.string() }))
      .query(async ({ input }) => {
        return getComments(input.documentSlug);
      }),

    add: publicProcedure
      .input(z.object({ documentSlug: z.string(), visitorId: z.string(), content: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        await logActivity('comment', input.documentSlug, input.visitorId);
        return addComment(input.documentSlug, input.visitorId, input.content);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number(), visitorId: z.string() }))
      .mutation(async ({ input }) => {
        return deleteComment(input.id, input.visitorId);
      }),
  }),

  // Custom Categories
  customCategories: router({
    list: publicProcedure.query(async () => {
      return getCustomCategories();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createCustomCategory(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCustomCategory(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteCustomCategory(input.id);
      }),
  }),

  // Announcements
  announcements: router({
    active: publicProcedure.query(async () => {
      return getActiveAnnouncements();
    }),

    all: adminProcedure.query(async () => {
      return getAllAnnouncements();
    }),

    create: adminProcedure
      .input(z.object({
        message: z.string().min(1).max(500),
        type: z.enum(['info', 'warning', 'success']).optional().default('info'),
      }))
      .mutation(async ({ input }) => {
        return createAnnouncement(input.message, input.type);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        message: z.string().optional(),
        type: z.enum(['info', 'warning', 'success']).optional(),
        active: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateAnnouncement(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteAnnouncement(input.id);
      }),
  }),

  // Activity Log
  activity: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional().default(100) }))
      .query(async ({ input }) => {
        return getActivityLog(input.limit);
      }),

    downloads: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional().default(50) }))
      .query(async ({ input }) => {
        return getDownloadHistory(input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
