import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
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
  searchWithRelevance, getViewsOverTime, getTopDocuments, getDownloadTrends, getCategoryDistribution,
  getGlossaryTerms, createGlossaryTerm, updateGlossaryTerm, deleteGlossaryTerm,
  getDocumentDependencies, getDependentDocuments, addDocumentDependency, removeDocumentDependency,
  getReadingGoal, setReadingGoal, recordReadingCompletion, getWeeklyProgress,
  getDocumentTemplates, createDocumentTemplate, getDocumentTemplateById, incrementTemplateUsage, deleteDocumentTemplate,
  logAuditEntry, getAuditTrail, getAnalyticsExportData, getDocumentSummariesForAI,
  getBookmarkNotes, getBookmarkNote, upsertBookmarkNote, deleteBookmarkNote,
  createShareLink, getShareLinkByToken, getShareLinksForDocument, incrementShareLinkAccess, deleteShareLink,
  schedulePublish, getScheduledPublishes, getScheduledPublishForDoc, cancelScheduledPublish, processScheduledPublishes,
  renameTag, mergeTags, deleteTagGlobally, getAllTagsWithCounts,
  importDocumentFromContent, getDocumentsInReview, approveDocument, rejectDocument,
  getInlineComments, addInlineComment, resolveInlineComment, deleteInlineComment,
  getBrandingSettings, upsertBrandingSetting,
  getWebhooks, createWebhook, updateWebhook, deleteWebhook, fireWebhooks,
  trackRecentlyViewed, getRecentlyViewed,
  getDocumentForExport, getAllUsers, updateUserRole, getVisitorAnalytics, getVisitorDocumentAccess,
  archiveDocuments,
  submitFeedback, getFeedbackForDocument, getMyFeedback,
  getCategoryOrdering, saveCategoryOrdering,
  duplicateDocument, getReadingHistory,
  setDocumentVisibility, getPrivateDocuments,
  getCollections, getCollectionById, createCollection, updateCollection, deleteCollection,
  getCollectionItems, addCollectionItem, removeCollectionItem,
  bulkImportFromJSON, restoreDocumentVersion, getReadingHeatmap,
  subscribeToTarget, unsubscribeFromTarget, getUserSubscriptions, notifySubscribers,
  getUserNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount,
  saveReadingPosition, getReadingPosition, getAllReadingPositions,
  bulkMoveDocuments, mergeDocuments,
  setCategoryCoverImage, getCategoryCoverImage, getAllCategoryCoverImages,
  saveSearchHistory, getRecentSearches, clearUserSearchHistory,
  getDocumentGraph, getContentCalendarEvents,
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
        locale: z.string().max(10).optional().default('en'),
      }))
      .mutation(async ({ input }) => {
        const slug = input.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `ARG-Builder-${slug}.md`;
        const wordCount = input.content.split(/\s+/).filter(Boolean).length;
        const result = await createDocument({ slug, title: input.title, category: input.category, filename, content: input.content, wordCount, status: input.status, locale: input.locale });

        await notifyOwner({
          title: `New Document Created: ${input.title}`,
          content: `A new document "${input.title}" was created in the "${input.category}" category (${wordCount} words, status: ${input.status}).`,
        });

        await logActivity('create', slug, undefined, `Created: ${input.title}`);
        await logAuditEntry({ documentSlug: slug, action: 'created', field: undefined, oldValue: undefined, newValue: input.title, changedBy: 'admin' });
        await fireWebhooks('document.created', { slug, title: input.title, category: input.category, status: input.status });
        // Notify subscribers of new document in this category
        if (input.status === 'published') {
          await notifySubscribers(slug, input.category, 'created');
        }
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
        locale: z.string().max(10).optional(),
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

        // Log audit entries for changed fields
        if (data.title && existing && data.title !== existing.title) {
          await logAuditEntry({ documentSlug: slug, action: 'updated', field: 'title', oldValue: existing.title, newValue: data.title, changedBy: ctx.user?.name || 'admin' });
        }
        if (data.status && existing && data.status !== existing.status) {
          await logAuditEntry({ documentSlug: slug, action: 'status_changed', field: 'status', oldValue: existing.status || 'published', newValue: data.status, changedBy: ctx.user?.name || 'admin' });
        }
        if (data.category && existing && data.category !== existing.category) {
          await logAuditEntry({ documentSlug: slug, action: 'updated', field: 'category', oldValue: existing.category, newValue: data.category, changedBy: ctx.user?.name || 'admin' });
        }
        if (data.content && existing && data.content !== existing.content) {
          await logAuditEntry({ documentSlug: slug, action: 'updated', field: 'content', oldValue: '(previous version)', newValue: '(new version)', changedBy: ctx.user?.name || 'admin' });
        }

        // Notify owner when document moves to review status
        if (data.status === 'review') {
          await notifyOwner({
            title: `Document submitted for review: ${existing?.title || slug}`,
            content: `The document "${existing?.title || slug}" has been moved to review status and requires approval.`,
          });
        }

        const result = await updateDocument(slug, updateData);
        if (data.status === 'published') {
          await fireWebhooks('document.published', { slug, title: data.title || existing?.title });
          await notifySubscribers(slug, existing?.category || '', 'published');
        } else {
          await fireWebhooks('document.updated', { slug, title: data.title || existing?.title, changes: Object.keys(data) });
          await notifySubscribers(slug, existing?.category || '', 'updated');
        }
        return result;
      }),

    delete: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('delete', input.slug, undefined, `Deleted document`);
        await logAuditEntry({ documentSlug: input.slug, action: 'deleted', field: undefined, oldValue: input.slug, newValue: undefined, changedBy: 'admin' });
        await fireWebhooks('document.deleted', { slug: input.slug });
        return deleteDocument(input.slug);
      }),

    // Pinning
    pin: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('pin', input.slug);
        await logAuditEntry({ documentSlug: input.slug, action: 'pinned', field: 'pinned', oldValue: '0', newValue: '1', changedBy: 'admin' });
        return pinDocument(input.slug);
      }),

    unpin: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await logActivity('unpin', input.slug);
        await logAuditEntry({ documentSlug: input.slug, action: 'unpinned', field: 'pinned', oldValue: '1', newValue: '0', changedBy: 'admin' });
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

  // Relevance Search
  relevanceSearch: router({
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1),
        category: z.string().optional(),
        locale: z.string().optional(),
        limit: z.number().min(1).max(50).optional().default(30),
      }))
      .query(async ({ input }) => {
        return searchWithRelevance(input.query, input);
      }),
  }),

  // Analytics Dashboard
  analytics: router({
    viewsOverTime: adminProcedure
      .input(z.object({ days: z.number().min(1).max(90).optional().default(30) }))
      .query(async ({ input }) => {
        return getViewsOverTime(input.days);
      }),

    topDocuments: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }))
      .query(async ({ input }) => {
        return getTopDocuments(input.limit);
      }),

    downloadTrends: adminProcedure
      .input(z.object({ days: z.number().min(1).max(90).optional().default(30) }))
      .query(async ({ input }) => {
        return getDownloadTrends(input.days);
      }),

    categoryDistribution: adminProcedure.query(async () => {
      return getCategoryDistribution();
    }),
  }),

  // Glossary
  glossary: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => {
        return getGlossaryTerms(input.category);
      }),

    create: adminProcedure
      .input(z.object({
        term: z.string().min(1).max(200),
        definition: z.string().min(1),
        category: z.string().optional(),
        relatedTerms: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createGlossaryTerm(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        term: z.string().optional(),
        definition: z.string().optional(),
        category: z.string().optional(),
        relatedTerms: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateGlossaryTerm(id, data);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteGlossaryTerm(input.id);
      }),
  }),

  // Document Dependencies
  dependencies: router({
    prerequisites: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getDocumentDependencies(input.slug);
      }),

    dependents: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getDependentDocuments(input.slug);
      }),

    add: adminProcedure
      .input(z.object({ documentSlug: z.string(), prerequisiteSlug: z.string() }))
      .mutation(async ({ input }) => {
        return addDocumentDependency(input.documentSlug, input.prerequisiteSlug);
      }),

    remove: adminProcedure
      .input(z.object({ documentSlug: z.string(), prerequisiteSlug: z.string() }))
      .mutation(async ({ input }) => {
        return removeDocumentDependency(input.documentSlug, input.prerequisiteSlug);
      }),
  }),

  // Reading Goals & Progress
  readingGoals: router({
    get: publicProcedure
      .input(z.object({ visitorId: z.string() }))
      .query(async ({ input }) => {
        return getWeeklyProgress(input.visitorId);
      }),

    setGoal: publicProcedure
      .input(z.object({ visitorId: z.string(), weeklyTarget: z.number().min(1).max(50) }))
      .mutation(async ({ input }) => {
        return setReadingGoal(input.visitorId, input.weeklyTarget);
      }),

    recordCompletion: publicProcedure
      .input(z.object({ visitorId: z.string(), documentSlug: z.string() }))
      .mutation(async ({ input }) => {
        await recordReadingCompletion(input.visitorId, input.documentSlug);
        return { success: true };
      }),
  }),

  // Document Templates Gallery
  templates: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => {
        return getDocumentTemplates(input.category);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getDocumentTemplateById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        category: z.string().min(1).max(100),
        content: z.string().min(1),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createDocumentTemplate(input);
      }),

    use: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementTemplateUsage(input.id);
        const template = await getDocumentTemplateById(input.id);
        return template;
      }),

     delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteDocumentTemplate(input.id);
      }),
  }),

  // ─── Audit Trail ─────────────────────────────────────────────────────────
  audit: router({
    log: adminProcedure
      .input(z.object({
        documentSlug: z.string(),
        action: z.string(),
        field: z.string().optional(),
        oldValue: z.string().optional(),
        newValue: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await logAuditEntry({ ...input, changedBy: ctx.user?.name || 'admin' });
        return { success: true };
      }),
    get: adminProcedure
      .input(z.object({ slug: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getAuditTrail(input.slug, input.limit);
      }),
  }),

  // ─── Analytics Export ────────────────────────────────────────────────────
  analyticsExport: router({
    csv: adminProcedure.query(async () => {
      return getAnalyticsExportData();
    }),
  }),

  // ─── AI Related Suggestions ──────────────────────────────────────────────
  aiSuggestions: router({
    related: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const doc = await getDocumentBySlug(input.slug);
        if (!doc) return [];
        const candidates = await getDocumentSummariesForAI(input.slug, 20);
        if (candidates.length === 0) return [];

        const candidateList = candidates.map(c => `- ${c.slug}: ${c.title} (${c.category})${c.summary ? ' - ' + c.summary.substring(0, 100) : ''}`).join('\n');

        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'You are a document recommendation engine. Given a source document and a list of candidates, return the top 5 most related document slugs as a JSON array of strings. Only return the JSON array, nothing else.' },
              { role: 'user', content: `Source document: "${doc.title}" (${doc.category})\nSummary: ${doc.summary || doc.content?.substring(0, 200) || ''}\n\nCandidates:\n${candidateList}\n\nReturn top 5 related slugs as JSON array:` },
            ],
          });
          const content = String(response.choices?.[0]?.message?.content || '[]');
          const slugs = JSON.parse(content.replace(/```json?\n?|```/g, '').trim());
          return Array.isArray(slugs) ? slugs.slice(0, 5) : [];
        } catch {
          return [];
        }
      }),
  }),

  // ==================== Batch 11: Bookmark Notes ====================
  bookmarkNotes: router({
    list: publicProcedure
      .input(z.object({ visitorId: z.string() }))
      .query(async ({ input }) => getBookmarkNotes(input.visitorId)),

    get: publicProcedure
      .input(z.object({ visitorId: z.string(), documentSlug: z.string() }))
      .query(async ({ input }) => getBookmarkNote(input.visitorId, input.documentSlug)),

    upsert: publicProcedure
      .input(z.object({ visitorId: z.string(), documentSlug: z.string(), note: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => upsertBookmarkNote(input.visitorId, input.documentSlug, input.note)),

    delete: publicProcedure
      .input(z.object({ visitorId: z.string(), documentSlug: z.string() }))
      .mutation(async ({ input }) => deleteBookmarkNote(input.visitorId, input.documentSlug)),
  }),

  // ==================== Batch 11: Share Links ====================
  shareLinks: router({
    create: adminProcedure
      .input(z.object({
        documentSlug: z.string(),
        expiresInHours: z.number().min(1).max(720).default(24),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
        return createShareLink(input.documentSlug, token, expiresAt, ctx.user?.name || 'admin');
      }),

    listForDoc: adminProcedure
      .input(z.object({ documentSlug: z.string() }))
      .query(async ({ input }) => getShareLinksForDocument(input.documentSlug)),

    resolve: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const link = await getShareLinkByToken(input.token);
        if (!link) return { valid: false as const, slug: null, document: null, expiresAt: null };
        if (new Date(link.expiresAt) < new Date()) return { valid: false as const, slug: null, expired: true, document: null, expiresAt: link.expiresAt };
        await incrementShareLinkAccess(input.token);
        // Fetch the document so share page can render it directly (even draft/private)
        const doc = await getDocumentBySlug(link.documentSlug);
        return {
          valid: true as const,
          slug: link.documentSlug,
          expired: false,
          expiresAt: link.expiresAt,
          document: doc ? { title: doc.title, content: doc.content, category: doc.category, status: doc.status, readingTime: Math.ceil((doc.wordCount || 200) / 200) } : null,
        };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteShareLink(input.id)),
  }),

  // ==================== Batch 11: Scheduled Publish ====================
  scheduledPublish: router({
    schedule: adminProcedure
      .input(z.object({
        documentSlug: z.string(),
        publishAt: z.string(), // ISO date string
      }))
      .mutation(async ({ input, ctx }) => {
        const publishDate = new Date(input.publishAt);
        if (publishDate <= new Date()) throw new Error('Publish date must be in the future');
        return schedulePublish(input.documentSlug, publishDate, ctx.user?.name || 'admin');
      }),

    list: adminProcedure
      .query(async () => getScheduledPublishes()),

    getForDoc: adminProcedure
      .input(z.object({ documentSlug: z.string() }))
      .query(async ({ input }) => getScheduledPublishForDoc(input.documentSlug)),

    cancel: adminProcedure
      .input(z.object({ documentSlug: z.string() }))
      .mutation(async ({ input }) => cancelScheduledPublish(input.documentSlug)),

    process: adminProcedure
      .mutation(async () => processScheduledPublishes()),
  }),

  // ==================== Batch 11: Approval Queue ====================
  approvals: router({
    list: adminProcedure
      .query(async () => getDocumentsInReview()),

    approve: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        await approveDocument(input.slug);
        await logAuditEntry({ documentSlug: input.slug, action: 'approved', field: 'status', oldValue: 'review', newValue: 'published', changedBy: 'admin' });
        await logActivity('approve', input.slug, undefined, 'Approved for publishing');
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({ slug: z.string(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        await rejectDocument(input.slug);
        await logAuditEntry({ documentSlug: input.slug, action: 'rejected', field: 'status', oldValue: 'review', newValue: 'draft', changedBy: 'admin' });
        await logActivity('reject', input.slug, undefined, input.reason || 'Rejected - returned to draft');
        return { success: true };
      }),
  }),

  // ==================== Batch 11: Bulk Tag Management ====================
  tagManagement: router({
    listWithCounts: adminProcedure
      .query(async () => getAllTagsWithCounts()),

    rename: adminProcedure
      .input(z.object({ oldTag: z.string(), newTag: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        const affected = await renameTag(input.oldTag, input.newTag.toLowerCase().trim());
        return { affected };
      }),

    merge: adminProcedure
      .input(z.object({ sourceTag: z.string(), targetTag: z.string() }))
      .mutation(async ({ input }) => {
        const merged = await mergeTags(input.sourceTag, input.targetTag);
        return { merged };
      }),

    deleteGlobally: adminProcedure
      .input(z.object({ tag: z.string() }))
      .mutation(async ({ input }) => {
        const deleted = await deleteTagGlobally(input.tag);
        return { deleted };
      }),
  }),

  // ==================== Batch 11: Import from URL ====================
  importFromUrl: router({
    import: adminProcedure
      .input(z.object({
        url: z.string().url(),
        title: z.string().min(1).max(500),
        category: z.string().min(1).max(100),
        locale: z.string().max(10).optional().default('en'),
      }))
      .mutation(async ({ input }) => {
        // Fetch content from URL
        const response = await fetch(input.url);
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);
        const html = await response.text();
        // Simple HTML-to-text extraction (strip tags)
        const content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        const slug = input.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
        const result = await importDocumentFromContent(slug, input.title, input.category, content, input.locale);
        await logActivity('import_url', slug, undefined, `Imported from: ${input.url}`);
        return result;
      }),
  }),

  // ==================== Batch 12: Inline Comments ====================
  inlineComments: router({
    list: publicProcedure
      .input(z.object({ documentSlug: z.string() }))
      .query(async ({ input }) => getInlineComments(input.documentSlug)),

    add: publicProcedure
      .input(z.object({
        documentSlug: z.string(),
        visitorId: z.string(),
        highlightText: z.string(),
        comment: z.string(),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await addInlineComment(input);
        await fireWebhooks('comment.created', { documentSlug: input.documentSlug, comment: input.comment });
        return result;
      }),

    resolve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => resolveInlineComment(input.id)),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteInlineComment(input.id)),
  }),

  // ==================== Batch 12: Branding Settings ====================
  branding: router({
    get: publicProcedure.query(async () => getBrandingSettings()),

    update: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => upsertBrandingSetting(input.key, input.value)),
  }),

  // ==================== Batch 12: Webhooks ====================
  webhooks: router({
    list: adminProcedure.query(async () => getWebhooks()),

    create: adminProcedure
      .input(z.object({
        url: z.string().url(),
        events: z.array(z.string()),
        secret: z.string().optional(),
      }))
      .mutation(async ({ input }) => createWebhook({ url: input.url, events: JSON.stringify(input.events), secret: input.secret })),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        active: z.boolean().optional(),
        secret: z.string().optional(),
      }))
      .mutation(async ({ input }) => updateWebhook(input.id, {
        url: input.url,
        events: input.events ? JSON.stringify(input.events) : undefined,
        active: input.active !== undefined ? (input.active ? 1 : 0) : undefined,
        secret: input.secret,
      })),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteWebhook(input.id)),
  }),

  // ==================== Batch 12: Recently Viewed ====================
  recentlyViewed: router({
    track: publicProcedure
      .input(z.object({ visitorId: z.string(), documentSlug: z.string() }))
      .mutation(async ({ input }) => {
        await trackRecentlyViewed(input.visitorId, input.documentSlug);
        return { success: true };
      }),

    list: publicProcedure
      .input(z.object({ visitorId: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => getRecentlyViewed(input.visitorId, input.limit)),
  }),

  // ==================== Batch 12: Document Export DOCX ====================
  documentExport: router({
    docx: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const doc = await getDocumentForExport(input.slug);
        if (!doc) return { error: 'Document not found' };
        // Return the document data for client-side DOCX generation
        return { title: doc.title, content: doc.content, category: doc.category };
      }),
  }),

  // ==================== Batch 12: Admin User Management ====================
  userManagement: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), search: z.string().optional() }))
      .query(async ({ input }) => getAllUsers(input)),

    updateRole: adminProcedure
      .input(z.object({ openId: z.string(), role: z.enum(['user', 'admin']) }))
      .mutation(async ({ input }) => updateUserRole(input.openId, input.role)),

    analytics: adminProcedure
      .query(async () => getVisitorAnalytics()),

    visitorAccess: adminProcedure
      .input(z.object({ visitorId: z.string() }))
      .query(async ({ input }) => getVisitorDocumentAccess(input.visitorId)),
  }),

  // ==================== Batch 12: Bulk Archive/Restore ====================
  archive: router({
    archive: adminProcedure
      .input(z.object({ slugs: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        await archiveDocuments(input.slugs);
        for (const slug of input.slugs) {
          await logAuditEntry({ documentSlug: slug, action: 'archived' });
          await fireWebhooks('document.archived', { slug });
        }
        return { archived: input.slugs.length };
      }),

    restore: adminProcedure
      .input(z.object({ slugs: z.array(z.string()), status: z.enum(['draft', 'review', 'published']).optional() }))
      .mutation(async ({ input }) => {
        const targetStatus = input.status || 'draft';
        await batchUpdateStatus(input.slugs, targetStatus);
        for (const slug of input.slugs) {
          await logAuditEntry({ documentSlug: slug, action: 'restored', field: 'status', newValue: targetStatus });
        }
        return { restored: input.slugs.length };
      }),
  }),

  // ─── Document Feedback ──────────────────────────────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(z.object({ documentSlug: z.string(), visitorId: z.string(), sentiment: z.enum(['positive', 'negative']), comment: z.string().optional() }))
      .mutation(async ({ input }) => submitFeedback(input)),

    get: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => getFeedbackForDocument(input.slug)),

    mine: publicProcedure
      .input(z.object({ slug: z.string(), visitorId: z.string() }))
      .query(async ({ input }) => getMyFeedback(input.slug, input.visitorId)),
  }),

  // ─── Category Ordering ─────────────────────────────────────────────────
  categoryOrder: router({
    get: publicProcedure.query(async () => getCategoryOrdering()),

    save: adminProcedure
      .input(z.object({ categories: z.array(z.object({ name: z.string(), sortOrder: z.number() })) }))
      .mutation(async ({ input }) => saveCategoryOrdering(input.categories)),
  }),

  // ─── Document Duplication ──────────────────────────────────────────────
  duplicate: router({
    create: adminProcedure
      .input(z.object({ slug: z.string() }))
      .mutation(async ({ input }) => {
        const doc = await duplicateDocument(input.slug);
        await logAuditEntry({ documentSlug: doc?.slug || input.slug, action: 'duplicated', field: 'source', newValue: input.slug });
        return doc;
      }),
  }),

  // ─── Reading History ───────────────────────────────────────────────────
  readingHistory: router({
    list: publicProcedure
      .input(z.object({ visitorId: z.string(), limit: z.number().optional() }))
      .query(async ({ input }) => getReadingHistory(input.visitorId, input.limit)),
  }),

  // ─── Document Visibility / Access Control ──────────────────────────────
  visibility: router({
    set: adminProcedure
      .input(z.object({ slug: z.string(), visibility: z.enum(['public', 'private']) }))
      .mutation(async ({ input }) => {
        await logAuditEntry({ documentSlug: input.slug, action: 'visibility_changed', field: 'visibility', newValue: input.visibility });
        return setDocumentVisibility(input.slug, input.visibility);
      }),
    private: adminProcedure.query(async () => getPrivateDocuments()),
  }),

  // ─── Document Collections / Playlists ──────────────────────────────────
  collections: router({
    list: publicProcedure
      .input(z.object({ publishedOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => getCollections({ publishedOnly: input?.publishedOnly })),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const collection = await getCollectionById(input.id);
        if (!collection) return null;
        const items = await getCollectionItems(input.id);
        return { ...collection, items };
      }),
    create: adminProcedure
      .input(z.object({ name: z.string(), description: z.string().optional(), coverColor: z.string().optional() }))
      .mutation(async ({ input, ctx }) => createCollection({ ...input, createdBy: ctx.user.openId })),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), coverColor: z.string().optional(), isPublished: z.number().optional() }))
      .mutation(async ({ input }) => updateCollection(input.id, input)),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteCollection(input.id)),
    addItem: adminProcedure
      .input(z.object({ collectionId: z.number(), documentSlug: z.string() }))
      .mutation(async ({ input }) => addCollectionItem(input.collectionId, input.documentSlug)),
    removeItem: adminProcedure
      .input(z.object({ collectionId: z.number(), documentSlug: z.string() }))
      .mutation(async ({ input }) => removeCollectionItem(input.collectionId, input.documentSlug)),
  }),

  // ─── Bulk Import from JSON ─────────────────────────────────────────────
  importJSON: router({
    import: adminProcedure
      .input(z.object({ documents: z.array(z.object({ title: z.string(), category: z.string(), content: z.string(), status: z.string().optional(), locale: z.string().optional() })) }))
      .mutation(async ({ input }) => bulkImportFromJSON(input.documents)),
  }),

  // ─── Document Version Restore ──────────────────────────────────────────
  versionRestore: router({
    restore: adminProcedure
      .input(z.object({ slug: z.string(), versionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await logAuditEntry({ documentSlug: input.slug, action: 'version_restored', field: 'versionId', newValue: String(input.versionId), changedBy: ctx.user.openId });
        return restoreDocumentVersion(input.slug, input.versionId, ctx.user.name || ctx.user.openId);
      }),
  }),

  // ─── Reading Heatmap ───────────────────────────────────────────────────
  heatmap: router({
    get: adminProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => getReadingHeatmap(input.days)),
  }),

  // ─── Batch 15: Subscriptions & Notifications ──────────────────────────
  subscriptions: router({
    subscribe: protectedProcedure
      .input(z.object({ targetType: z.enum(['document', 'category']), targetValue: z.string() }))
      .mutation(async ({ input, ctx }) => subscribeToTarget(ctx.user.openId, input.targetType, input.targetValue)),
    unsubscribe: protectedProcedure
      .input(z.object({ targetType: z.enum(['document', 'category']), targetValue: z.string() }))
      .mutation(async ({ input, ctx }) => unsubscribeFromTarget(ctx.user.openId, input.targetType, input.targetValue)),
    list: protectedProcedure.query(async ({ ctx }) => getUserSubscriptions(ctx.user.openId)),
    notifications: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => getUserNotifications(ctx.user.openId, input.limit)),
    unreadCount: protectedProcedure.query(async ({ ctx }) => getUnreadNotificationCount(ctx.user.openId)),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => markNotificationRead(input.id, ctx.user.openId)),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => markAllNotificationsRead(ctx.user.openId)),
  }),

  // ─── Batch 15: Reading Position (server-side) ─────────────────────────
  readingPosition: router({
    save: protectedProcedure
      .input(z.object({ documentSlug: z.string(), scrollPercent: z.number().min(0).max(100) }))
      .mutation(async ({ input, ctx }) => saveReadingPosition(ctx.user.openId, input.documentSlug, input.scrollPercent)),
    get: protectedProcedure
      .input(z.object({ documentSlug: z.string() }))
      .query(async ({ input, ctx }) => getReadingPosition(ctx.user.openId, input.documentSlug)),
    all: protectedProcedure.query(async ({ ctx }) => getAllReadingPositions(ctx.user.openId)),
  }),

  // ─── Batch 15: Bulk Move Documents ─────────────────────────────────────
  bulkMove: router({
    move: adminProcedure
      .input(z.object({ slugs: z.array(z.string()), newCategory: z.string() }))
      .mutation(async ({ input }) => bulkMoveDocuments(input.slugs, input.newCategory)),
  }),

  // ─── Batch 15: Document Merge ──────────────────────────────────────────
  merge: router({
    merge: adminProcedure
      .input(z.object({ sourceSlug: z.string(), targetSlug: z.string() }))
      .mutation(async ({ input }) => mergeDocuments(input.sourceSlug, input.targetSlug)),
  }),

  // ─── Batch 15: Category Cover Images ───────────────────────────────────
  categoryCover: router({
    set: adminProcedure
      .input(z.object({ categoryName: z.string(), imageUrl: z.string() }))
      .mutation(async ({ input }) => setCategoryCoverImage(input.categoryName, input.imageUrl)),
    get: publicProcedure
      .input(z.object({ categoryName: z.string() }))
      .query(async ({ input }) => getCategoryCoverImage(input.categoryName)),
    all: publicProcedure.query(async () => getAllCategoryCoverImages()),
  }),

  // ─── Batch 15: Search History ──────────────────────────────────────────
  searchHistory: router({
    save: protectedProcedure
      .input(z.object({ query: z.string(), resultCount: z.number() }))
      .mutation(async ({ input, ctx }) => saveSearchHistory(ctx.user.openId, input.query, input.resultCount)),
    recent: protectedProcedure.query(async ({ ctx }) => getRecentSearches(ctx.user.openId)),
    clear: protectedProcedure.mutation(async ({ ctx }) => clearUserSearchHistory(ctx.user.openId)),
  }),

  // ─── Batch 15: Document Graph ──────────────────────────────────────────
  documentGraph: router({
    get: publicProcedure.query(async () => getDocumentGraph()),
  }),

  // ─── Batch 15: Content Calendar ────────────────────────────────────────
  contentCalendar: router({
    events: adminProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => getContentCalendarEvents(input.startDate, input.endDate)),
  }),
});
export type AppRouter = typeof appRouter;
