import { eq, like, or, sql, desc, asc, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, documentRatings, readingLists, readingListItems, searchAnalytics, documentTags, documentComments, documentVersions, customCategories, downloadHistory, announcements, activityLog, documentAuditTrail, bookmarkNotes, shareLinks, scheduledPublish, inlineComments, brandingSettings, webhooks, recentlyViewed, documentFeedback, categoryOrdering, documentSubscriptions, subscriptionNotifications, userReadingPosition, searchHistory, aiSummaries, documentTranslations, userPreferences, readingStreakLeaderboard, glossaryTerms, documentDependencies, readingGoals, readingProgress, documentTemplates, savedFilters, documentQuizzes, reviewReminders, documentAnnotations, documentCollections, collectionItems, workflowStatuses, workflowTransitions, documentWorkflowStatus, archivalPolicies, archivedDocuments, contentGapSuggestions, duplicateContentPairs, activityFeed, documentSnapshots, readingCorrelations, quizResults, documentSeoMeta, systemNotificationLog, adminPermissions, approvalSlaConfig, webhookEventLog, documentAccessRequests, onboardingProgress, documentCitations, readingSessions, documentQualityAudits, emailDigestConfig, documentMedia } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Document Queries ───────────────────────────────────────────────────────

export async function getDocuments(opts: {
  category?: string;
  search?: string;
  sort?: 'alpha' | 'reading_time' | 'newest';
  limit?: number;
  offset?: number;
  status?: 'draft' | 'review' | 'published' | 'all';
  tags?: string[];
  minReadingTime?: number;
  maxReadingTime?: number;
}) {
  const db = await getDb();
  if (!db) return { documents: [], total: 0 };

  const { category, search, sort = 'alpha', limit = 50, offset = 0, status = 'published', tags, minReadingTime, maxReadingTime } = opts;

  const conditions = [];
  
  // Visibility filter: exclude private documents from public queries
  // Private docs only visible when status='all' (admin context)
  if (status !== 'all') {
    conditions.push(sql`(${documents.visibility} IS NULL OR ${documents.visibility} = 'public')`);
  }
  
  // Status filter (default: only published docs for public)
  if (status !== 'all') {
    conditions.push(eq(documents.status, status));
  }
  
  if (category) {
    conditions.push(eq(documents.category, category));
  }
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${documents.title}) LIKE ${pattern} OR LOWER(${documents.category}) LIKE ${pattern} OR LOWER(${documents.content}) LIKE ${pattern})`
    );
  }
  if (minReadingTime) {
    const minWords = minReadingTime * 200;
    conditions.push(sql`${documents.wordCount} >= ${minWords}`);
  }
  if (maxReadingTime) {
    const maxWords = maxReadingTime * 200;
    conditions.push(sql`${documents.wordCount} <= ${maxWords}`);
  }

  const whereClause = conditions.length > 0
    ? sql`${sql.join(conditions, sql` AND `)}`
    : undefined;

  // Get total count
  const countResult = whereClause
    ? await db.select({ total: count() }).from(documents).where(whereClause)
    : await db.select({ total: count() }).from(documents);
  const total = countResult[0]?.total ?? 0;

  // When searching, include a snippet of matched content
  const selectFields = {
    id: documents.id,
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    filename: documents.filename,
    wordCount: documents.wordCount,
    status: documents.status,
    pinned: documents.pinned,
    createdAt: documents.createdAt,
    ...(search ? { snippet: sql<string>`SUBSTRING(${documents.content}, GREATEST(1, LOCATE(LOWER(${search}), LOWER(${documents.content})) - 60), 200)` } : {}),
  };

  // Order: pinned first, then by sort
  const orderClauses = [
    desc(documents.pinned),
    sort === 'reading_time' ? asc(documents.wordCount) : sort === 'newest' ? desc(documents.createdAt) : asc(documents.title),
  ];

  const rows = whereClause
    ? await db
        .select(selectFields)
        .from(documents)
        .where(whereClause)
        .orderBy(...orderClauses)
        .limit(limit)
        .offset(offset)
    : await db
        .select(selectFields)
        .from(documents)
        .orderBy(...orderClauses)
        .limit(limit)
        .offset(offset);

  // If tags filter is requested, filter in-app (since we don't have a join-based approach easily)
  if (tags && tags.length > 0) {
    const taggedSlugs = await db
      .select({ slug: documentTags.documentSlug })
      .from(documentTags)
      .where(sql`${documentTags.tag} IN (${sql.join(tags.map(t => sql`${t}`), sql`, `)})`);
    const slugSet = new Set(taggedSlugs.map(r => r.slug));
    const filtered = rows.filter(r => slugSet.has(r.slug));
    return { documents: filtered, total: filtered.length };
  }

  return { documents: rows, total };
}

export async function getDocumentBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getDocumentCategories() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      category: documents.category,
      count: count(),
    })
    .from(documents)
    .groupBy(documents.category)
    .orderBy(asc(documents.category));

  return result;
}

export async function getRelatedDocuments(slug: string, category: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: documents.id,
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      wordCount: documents.wordCount,
    })
    .from(documents)
    .where(sql`${documents.category} = ${category} AND ${documents.slug} != ${slug} AND ${documents.status} = 'published'`)
    .orderBy(sql`RAND()`)
    .limit(limit);

  return result;
}

// ─── Admin Document CRUD ────────────────────────────────────────────────────

export async function createDocument(data: {
  slug: string;
  title: string;
  category: string;
  filename: string;
  content: string;
  wordCount: number;
  status?: 'draft' | 'review' | 'published';
  locale?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(documents).values({
    ...data,
    status: data.status || 'published',
  });
  return getDocumentBySlug(data.slug);
}

export async function updateDocument(slug: string, data: {
  title?: string;
  category?: string;
  content?: string;
  status?: 'draft' | 'review' | 'published';
  pinned?: number;
  reviewBy?: Date | null;
  locale?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.category !== undefined) updateSet.category = data.category;
  if (data.content !== undefined) {
    updateSet.content = data.content;
    updateSet.wordCount = data.content.split(/\s+/).filter(Boolean).length;
  }
  if (data.status !== undefined) updateSet.status = data.status;
  if (data.pinned !== undefined) updateSet.pinned = data.pinned;
  if (data.reviewBy !== undefined) updateSet.reviewBy = data.reviewBy;
  if (data.locale !== undefined) updateSet.locale = data.locale;
  if (Object.keys(updateSet).length === 0) return getDocumentBySlug(slug);;

  await db.update(documents).set(updateSet).where(eq(documents.slug, slug));
  return getDocumentBySlug(slug);
}

export async function deleteDocument(slug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documents).where(eq(documents.slug, slug));
  return { success: true };
}

// Batch operations
export async function batchDeleteDocuments(slugs: string[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  for (const slug of slugs) {
    await db.delete(documents).where(eq(documents.slug, slug));
  }
  return { deleted: slugs.length };
}

export async function batchUpdateStatus(slugs: string[], status: 'draft' | 'review' | 'published') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  for (const slug of slugs) {
    await db.update(documents).set({ status }).where(eq(documents.slug, slug));
  }
  return { updated: slugs.length };
}

export async function batchAddTag(slugs: string[], tag: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  let added = 0;
  for (const slug of slugs) {
    const existing = await db.select().from(documentTags)
      .where(and(eq(documentTags.documentSlug, slug), eq(documentTags.tag, tag)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(documentTags).values({ documentSlug: slug, tag });
      added++;
    }
  }
  return { added };
}

export async function getDocumentStats() {
  const db = await getDb();
  if (!db) return null;

  const totalResult = await db.select({ total: count() }).from(documents);
  const wordResult = await db.select({ totalWords: sql<number>`COALESCE(SUM(${documents.wordCount}), 0)` }).from(documents);
  const catResult = await db.select({ cats: sql<number>`COUNT(DISTINCT ${documents.category})` }).from(documents);

  return {
    totalDocuments: totalResult[0]?.total ?? 0,
    totalWords: Number(wordResult[0]?.totalWords ?? 0),
    totalCategories: Number(catResult[0]?.cats ?? 0),
    avgReadingTime: Math.ceil(Number(wordResult[0]?.totalWords ?? 0) / (totalResult[0]?.total || 1) / 200),
  };
}

// ─── Document Pinning ─────────────────────────────────────────────────────

export async function pinDocument(slug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(documents).set({ pinned: 1 }).where(eq(documents.slug, slug));
  return { success: true };
}

export async function unpinDocument(slug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(documents).set({ pinned: 0 }).where(eq(documents.slug, slug));
  return { success: true };
}

export async function getPinnedDocuments() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    wordCount: documents.wordCount,
  }).from(documents).where(eq(documents.pinned, 1)).orderBy(asc(documents.title));
}

// ─── Stale/Expiry Documents ──────────────────────────────────────────────

export async function getStaleDocuments(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    reviewBy: documents.reviewBy,
    updatedAt: documents.updatedAt,
  }).from(documents)
    .where(sql`${documents.reviewBy} IS NOT NULL AND ${documents.reviewBy} <= NOW()`)
    .orderBy(asc(documents.reviewBy))
    .limit(limit);
}

// ─── Document Ratings ──────────────────────────────────────────────────────

export async function rateDocument(slug: string, visitorId: string, rating: 'up' | 'down') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db.select().from(documentRatings)
    .where(and(eq(documentRatings.documentSlug, slug), eq(documentRatings.visitorId, visitorId)))
    .limit(1);

  if (existing.length > 0) {
    const oldRating = existing[0].rating;
    if (oldRating === rating) {
      await db.delete(documentRatings).where(eq(documentRatings.id, existing[0].id));
      if (rating === 'up') {
        await db.update(documents).set({ upvotes: sql`GREATEST(0, ${documents.upvotes} - 1)` }).where(eq(documents.slug, slug));
      } else {
        await db.update(documents).set({ downvotes: sql`GREATEST(0, ${documents.downvotes} - 1)` }).where(eq(documents.slug, slug));
      }
      return { action: 'removed', rating: null };
    } else {
      await db.update(documentRatings).set({ rating }).where(eq(documentRatings.id, existing[0].id));
      if (rating === 'up') {
        await db.update(documents).set({ upvotes: sql`${documents.upvotes} + 1`, downvotes: sql`GREATEST(0, ${documents.downvotes} - 1)` }).where(eq(documents.slug, slug));
      } else {
        await db.update(documents).set({ downvotes: sql`${documents.downvotes} + 1`, upvotes: sql`GREATEST(0, ${documents.upvotes} - 1)` }).where(eq(documents.slug, slug));
      }
      return { action: 'changed', rating };
    }
  } else {
    await db.insert(documentRatings).values({ documentSlug: slug, visitorId, rating });
    if (rating === 'up') {
      await db.update(documents).set({ upvotes: sql`${documents.upvotes} + 1` }).where(eq(documents.slug, slug));
    } else {
      await db.update(documents).set({ downvotes: sql`${documents.downvotes} + 1` }).where(eq(documents.slug, slug));
    }
    return { action: 'added', rating };
  }
}

export async function getUserRating(slug: string, visitorId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(documentRatings)
    .where(and(eq(documentRatings.documentSlug, slug), eq(documentRatings.visitorId, visitorId)))
    .limit(1);

  return result.length > 0 ? result[0].rating : null;
}

// ─── View Count ────────────────────────────────────────────────────────────

export async function incrementViewCount(slug: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(documents).set({ viewCount: sql`${documents.viewCount} + 1` }).where(eq(documents.slug, slug));
}

// ─── Popular Documents ─────────────────────────────────────────────────────

export async function getPopularDocuments(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      wordCount: documents.wordCount,
      viewCount: documents.viewCount,
      upvotes: documents.upvotes,
      downvotes: documents.downvotes,
    })
    .from(documents)
    .where(eq(documents.status, 'published'))
    .orderBy(desc(sql`(${documents.viewCount} + ${documents.upvotes} * 3 - ${documents.downvotes})`))
    .limit(limit);

  return result;
}

// ─── Reading Lists ─────────────────────────────────────────────────────────

export async function getReadingLists(visitorId: string) {
  const db = await getDb();
  if (!db) return [];

  const lists = await db.select().from(readingLists)
    .where(eq(readingLists.visitorId, visitorId))
    .orderBy(desc(readingLists.updatedAt));

  const result = [];
  for (const list of lists) {
    const items = await db.select({ count: count() }).from(readingListItems)
      .where(eq(readingListItems.listId, list.id));
    result.push({ ...list, itemCount: items[0]?.count ?? 0 });
  }

  return result;
}

export async function createReadingList(visitorId: string, name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(readingLists).values({ visitorId, name, description: description || null });
  return { id: result[0].insertId, name };
}

export async function addToReadingList(listId: number, documentSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db.select().from(readingListItems)
    .where(and(eq(readingListItems.listId, listId), eq(readingListItems.documentSlug, documentSlug)))
    .limit(1);

  if (existing.length > 0) return { alreadyExists: true };

  await db.insert(readingListItems).values({ listId, documentSlug });
  return { alreadyExists: false };
}

export async function removeFromReadingList(listId: number, documentSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(readingListItems)
    .where(and(eq(readingListItems.listId, listId), eq(readingListItems.documentSlug, documentSlug)));
  return { success: true };
}

export async function getReadingListItems(listId: number) {
  const db = await getDb();
  if (!db) return [];

  const items = await db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    wordCount: documents.wordCount,
    addedAt: readingListItems.addedAt,
  })
    .from(readingListItems)
    .innerJoin(documents, eq(readingListItems.documentSlug, documents.slug))
    .where(eq(readingListItems.listId, listId))
    .orderBy(desc(readingListItems.addedAt));

  return items;
}

export async function deleteReadingList(listId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(readingListItems).where(eq(readingListItems.listId, listId));
  await db.delete(readingLists).where(eq(readingLists.id, listId));
  return { success: true };
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

export async function bulkImportDocuments(docs: Array<{ title: string; category: string; content: string }>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results = [];
  for (const doc of docs) {
    const slug = doc.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    const wordCount = doc.content.split(/\s+/).filter(Boolean).length;
    try {
      await db.insert(documents).values({
        slug,
        title: doc.title,
        category: doc.category,
        filename: `${slug}.md`,
        content: doc.content,
        wordCount,
      });
      results.push({ title: doc.title, status: 'created' });
    } catch (err: any) {
      results.push({ title: doc.title, status: 'error', error: err.message });
    }
  }
  return results;
}

// ─── AI Summary ────────────────────────────────────────────────────────────

export async function saveSummary(slug: string, summary: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(documents).set({ summary }).where(eq(documents.slug, slug));
  return { success: true };
}

// ─── Search Analytics ─────────────────────────────────────────────────────

export async function logSearchQuery(query: string, resultCount: number, visitorId?: string) {
  const db = await getDb();
  if (!db) return;

  await db.insert(searchAnalytics).values({
    query: query.substring(0, 500),
    resultCount,
    visitorId: visitorId || null,
    clickedSlug: null,
  });
}

export async function logSearchClick(query: string, clickedSlug: string, visitorId?: string) {
  const db = await getDb();
  if (!db) return;

  await db.insert(searchAnalytics).values({
    query: query.substring(0, 500),
    resultCount: 0,
    visitorId: visitorId || null,
    clickedSlug,
  });
}

export async function getPopularSearches(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      query: searchAnalytics.query,
      searchCount: count(searchAnalytics.id),
    })
    .from(searchAnalytics)
    .where(sql`${searchAnalytics.clickedSlug} IS NULL`)
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count(searchAnalytics.id)))
    .limit(limit);

  return result;
}

export async function getSearchAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { totalSearches: 0, uniqueQueries: 0, avgResultCount: 0, zeroResultQueries: [] };

  const totalResult = await db.select({ total: count() }).from(searchAnalytics).where(sql`${searchAnalytics.clickedSlug} IS NULL`);
  const totalSearches = totalResult[0]?.total || 0;

  const uniqueResult = await db.select({ unique: sql<number>`COUNT(DISTINCT ${searchAnalytics.query})` }).from(searchAnalytics);
  const uniqueQueries = (uniqueResult[0] as any)?.unique || 0;

  const avgResult = await db.select({ avg: sql<number>`AVG(${searchAnalytics.resultCount})` }).from(searchAnalytics).where(sql`${searchAnalytics.clickedSlug} IS NULL`);
  const avgResultCount = Math.round((avgResult[0] as any)?.avg || 0);

  const zeroResults = await db
    .select({ query: searchAnalytics.query, searchCount: count(searchAnalytics.id) })
    .from(searchAnalytics)
    .where(and(sql`${searchAnalytics.clickedSlug} IS NULL`, eq(searchAnalytics.resultCount, 0)))
    .groupBy(searchAnalytics.query)
    .orderBy(desc(count(searchAnalytics.id)))
    .limit(10);

  return { totalSearches, uniqueQueries, avgResultCount, zeroResultQueries: zeroResults };
}

// ─── Document Tags ────────────────────────────────────────────────────────

export async function addTag(documentSlug: string, tag: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db.select().from(documentTags)
    .where(and(eq(documentTags.documentSlug, documentSlug), eq(documentTags.tag, tag)))
    .limit(1);

  if (existing.length > 0) return { alreadyExists: true };

  await db.insert(documentTags).values({ documentSlug, tag });
  return { alreadyExists: false };
}

export async function removeTag(documentSlug: string, tag: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documentTags)
    .where(and(eq(documentTags.documentSlug, documentSlug), eq(documentTags.tag, tag)));
  return { success: true };
}

export async function getDocumentTags(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];

  const tags = await db.select({ tag: documentTags.tag })
    .from(documentTags)
    .where(eq(documentTags.documentSlug, documentSlug))
    .orderBy(asc(documentTags.tag));

  return tags.map(t => t.tag);
}

export async function getAllTags() {
  const db = await getDb();
  if (!db) return [];

  const tags = await db
    .select({ tag: documentTags.tag, docCount: count(documentTags.id) })
    .from(documentTags)
    .groupBy(documentTags.tag)
    .orderBy(desc(count(documentTags.id)));

  return tags;
}

export async function getDocumentsByTag(tag: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      wordCount: documents.wordCount,
    })
    .from(documentTags)
    .innerJoin(documents, eq(documentTags.documentSlug, documents.slug))
    .where(eq(documentTags.tag, tag))
    .orderBy(asc(documents.title));

  return result;
}

// ─── Document Comments ────────────────────────────────────────────────────

export async function addComment(documentSlug: string, visitorId: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(documentComments).values({ documentSlug, visitorId, content });
  return { id: result[0].insertId };
}

export async function getComments(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];

  const comments = await db.select()
    .from(documentComments)
    .where(eq(documentComments.documentSlug, documentSlug))
    .orderBy(desc(documentComments.createdAt));

  return comments;
}

export async function deleteComment(id: number, visitorId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documentComments)
    .where(and(eq(documentComments.id, id), eq(documentComments.visitorId, visitorId)));
  return { success: true };
}

// ─── Document Versions ────────────────────────────────────────────────────

export async function saveDocumentVersion(slug: string, title: string, content: string, editedBy?: string, changeNote?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(documentVersions).values({
    documentSlug: slug,
    title,
    content,
    editedBy: editedBy || null,
    changeNote: changeNote || null,
  });
  return { success: true };
}

export async function getDocumentVersions(slug: string) {
  const db = await getDb();
  if (!db) return [];

  const versions = await db.select({
    id: documentVersions.id,
    title: documentVersions.title,
    editedBy: documentVersions.editedBy,
    changeNote: documentVersions.changeNote,
    createdAt: documentVersions.createdAt,
  })
    .from(documentVersions)
    .where(eq(documentVersions.documentSlug, slug))
    .orderBy(desc(documentVersions.createdAt))
    .limit(20);

  return versions;
}

export async function getDocumentVersionContent(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(documentVersions)
    .where(eq(documentVersions.id, id))
    .limit(1);

  return result[0] || null;
}

// ─── Custom Categories ────────────────────────────────────────────────────

export async function getCustomCategories() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(customCategories).orderBy(asc(customCategories.name));
}

export async function createCustomCategory(data: { name: string; description?: string; icon?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(customCategories).values({
    name: data.name,
    description: data.description || null,
    icon: data.icon || null,
    color: data.color || null,
  });
  return { success: true, name: data.name };
}

export async function updateCustomCategory(id: number, data: { name?: string; description?: string; icon?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.icon !== undefined) updateSet.icon = data.icon;
  if (data.color !== undefined) updateSet.color = data.color;

  if (Object.keys(updateSet).length === 0) return { success: true };

  await db.update(customCategories).set(updateSet).where(eq(customCategories.id, id));
  return { success: true };
}

export async function deleteCustomCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(customCategories).where(eq(customCategories.id, id));
  return { success: true };
}

// ─── Download History ─────────────────────────────────────────────────────

export async function logDownload(documentSlug: string, format: string, visitorId?: string) {
  const db = await getDb();
  if (!db) return;

  await db.insert(downloadHistory).values({
    documentSlug,
    format,
    visitorId: visitorId || null,
  });
}

export async function getDownloadHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: downloadHistory.id,
    documentSlug: downloadHistory.documentSlug,
    format: downloadHistory.format,
    visitorId: downloadHistory.visitorId,
    createdAt: downloadHistory.createdAt,
  })
    .from(downloadHistory)
    .orderBy(desc(downloadHistory.createdAt))
    .limit(limit);
}

// ─── Announcements ────────────────────────────────────────────────────────

export async function getActiveAnnouncements() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(announcements)
    .where(eq(announcements.active, 1))
    .orderBy(desc(announcements.createdAt));
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}

export async function createAnnouncement(message: string, type: 'info' | 'warning' | 'success' = 'info') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(announcements).values({ message, type });
  return { id: result[0].insertId };
}

export async function updateAnnouncement(id: number, data: { message?: string; type?: 'info' | 'warning' | 'success'; active?: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateSet: Record<string, unknown> = {};
  if (data.message !== undefined) updateSet.message = data.message;
  if (data.type !== undefined) updateSet.type = data.type;
  if (data.active !== undefined) updateSet.active = data.active;

  await db.update(announcements).set(updateSet).where(eq(announcements.id, id));
  return { success: true };
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(announcements).where(eq(announcements.id, id));
  return { success: true };
}

// ─── Activity Log ─────────────────────────────────────────────────────────

export async function logActivity(action: string, documentSlug?: string, visitorId?: string, details?: string) {
  const db = await getDb();
  if (!db) return;

  await db.insert(activityLog).values({
    action,
    documentSlug: documentSlug || null,
    visitorId: visitorId || null,
    details: details || null,
  });
}

export async function getActivityLog(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ─── Full-text Relevance Search ──────────────────────────────────────────

export async function searchWithRelevance(query: string, opts: { category?: string; locale?: string; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return [];

  const { category, locale, limit = 30 } = opts;
  const pattern = `%${query.toLowerCase()}%`;

  const conditions = [
    sql`${documents.status} = 'published'`,
  ];
  if (category) conditions.push(eq(documents.category, category));
  if (locale) conditions.push(eq(documents.locale, locale));

  // Weighted scoring: title match = 10, tag match = 5, body match = 1
  const results = await db
    .select({
      slug: documents.slug,
      title: documents.title,
      category: documents.category,
      wordCount: documents.wordCount,
      locale: documents.locale,
      relevance: sql<number>`(
        CASE WHEN LOWER(${documents.title}) LIKE ${pattern} THEN 10 ELSE 0 END +
        CASE WHEN LOWER(${documents.content}) LIKE ${pattern} THEN 1 ELSE 0 END
      )`,
      snippet: sql<string>`SUBSTRING(${documents.content}, GREATEST(1, LOCATE(LOWER(${query}), LOWER(${documents.content})) - 60), 200)`,
    })
    .from(documents)
    .where(sql`${sql.join(conditions, sql` AND `)} AND (LOWER(${documents.title}) LIKE ${pattern} OR LOWER(${documents.content}) LIKE ${pattern})`)
    .orderBy(sql`(
      CASE WHEN LOWER(${documents.title}) LIKE ${pattern} THEN 10 ELSE 0 END +
      CASE WHEN LOWER(${documents.content}) LIKE ${pattern} THEN 1 ELSE 0 END
    ) DESC`)
    .limit(limit);

  // Boost results that have matching tags
  const tagResults = await db
    .select({ slug: documentTags.documentSlug })
    .from(documentTags)
    .where(sql`LOWER(${documentTags.tag}) LIKE ${pattern}`);
  const tagSlugs = new Set(tagResults.map(r => r.slug));

  return results.map(r => ({
    ...r,
    relevance: Number(r.relevance) + (tagSlugs.has(r.slug) ? 5 : 0),
  })).sort((a, b) => b.relevance - a.relevance);
}

// ─── Document Analytics ──────────────────────────────────────────────────

export async function getViewsOverTime(days = 30) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    date: sql<string>`DATE(${activityLog.createdAt})`,
    views: count(),
  })
    .from(activityLog)
    .where(sql`${activityLog.action} = 'view' AND ${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${activityLog.createdAt})`)
    .orderBy(sql`DATE(${activityLog.createdAt})`);
}

export async function getTopDocuments(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    viewCount: documents.viewCount,
    upvotes: documents.upvotes,
    downvotes: documents.downvotes,
  })
    .from(documents)
    .orderBy(desc(documents.viewCount))
    .limit(limit);
}

export async function getDownloadTrends(days = 30) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    date: sql<string>`DATE(${downloadHistory.createdAt})`,
    downloads: count(),
  })
    .from(downloadHistory)
    .where(sql`${downloadHistory.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${downloadHistory.createdAt})`)
    .orderBy(sql`DATE(${downloadHistory.createdAt})`);
}

export async function getCategoryDistribution() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    category: documents.category,
    count: count(),
    totalViews: sql<number>`COALESCE(SUM(${documents.viewCount}), 0)`,
  })
    .from(documents)
    .groupBy(documents.category)
    .orderBy(desc(count()));
}

// ─── Glossary ────────────────────────────────────────────────────────────

export async function getGlossaryTerms(category?: string) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return db.select().from(glossaryTerms)
      .where(eq(glossaryTerms.category, category))
      .orderBy(asc(glossaryTerms.term));
  }
  return db.select().from(glossaryTerms).orderBy(asc(glossaryTerms.term));
}

export async function createGlossaryTerm(data: { term: string; definition: string; category?: string; relatedTerms?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(glossaryTerms).values({
    term: data.term,
    definition: data.definition,
    category: data.category || null,
    relatedTerms: data.relatedTerms || null,
  });
  return { id: result[0].insertId };
}

export async function updateGlossaryTerm(id: number, data: { term?: string; definition?: string; category?: string; relatedTerms?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateSet: Record<string, unknown> = {};
  if (data.term !== undefined) updateSet.term = data.term;
  if (data.definition !== undefined) updateSet.definition = data.definition;
  if (data.category !== undefined) updateSet.category = data.category;
  if (data.relatedTerms !== undefined) updateSet.relatedTerms = data.relatedTerms;

  await db.update(glossaryTerms).set(updateSet).where(eq(glossaryTerms.id, id));
  return { success: true };
}

export async function deleteGlossaryTerm(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(glossaryTerms).where(eq(glossaryTerms.id, id));
  return { success: true };
}

// ─── Document Dependencies ───────────────────────────────────────────────

export async function getDocumentDependencies(slug: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    prerequisiteSlug: documentDependencies.prerequisiteSlug,
    title: documents.title,
    category: documents.category,
  })
    .from(documentDependencies)
    .innerJoin(documents, eq(documentDependencies.prerequisiteSlug, documents.slug))
    .where(eq(documentDependencies.documentSlug, slug));
}

export async function getDependentDocuments(slug: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    documentSlug: documentDependencies.documentSlug,
    title: documents.title,
    category: documents.category,
  })
    .from(documentDependencies)
    .innerJoin(documents, eq(documentDependencies.documentSlug, documents.slug))
    .where(eq(documentDependencies.prerequisiteSlug, slug));
}

export async function addDocumentDependency(documentSlug: string, prerequisiteSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db.select().from(documentDependencies)
    .where(and(eq(documentDependencies.documentSlug, documentSlug), eq(documentDependencies.prerequisiteSlug, prerequisiteSlug)))
    .limit(1);
  if (existing.length > 0) return { alreadyExists: true };

  await db.insert(documentDependencies).values({ documentSlug, prerequisiteSlug });
  return { alreadyExists: false };
}

export async function removeDocumentDependency(documentSlug: string, prerequisiteSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documentDependencies)
    .where(and(eq(documentDependencies.documentSlug, documentSlug), eq(documentDependencies.prerequisiteSlug, prerequisiteSlug)));
  return { success: true };
}

// ─── Reading Goals & Progress ────────────────────────────────────────────

export async function getReadingGoal(visitorId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(readingGoals)
    .where(eq(readingGoals.visitorId, visitorId))
    .limit(1);
  return result[0] || null;
}

export async function setReadingGoal(visitorId: string, weeklyTarget: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const existing = await db.select().from(readingGoals)
    .where(eq(readingGoals.visitorId, visitorId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(readingGoals).set({ weeklyTarget }).where(eq(readingGoals.visitorId, visitorId));
  } else {
    await db.insert(readingGoals).values({ visitorId, weeklyTarget });
  }
  return { success: true };
}

export async function recordReadingCompletion(visitorId: string, documentSlug: string) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  // Calculate ISO week number
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  // Check if already recorded this week
  const existing = await db.select().from(readingProgress)
    .where(and(
      eq(readingProgress.visitorId, visitorId),
      eq(readingProgress.documentSlug, documentSlug),
      eq(readingProgress.weekNumber, weekNumber),
      eq(readingProgress.yearNumber, now.getFullYear()),
    ))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(readingProgress).values({
      visitorId,
      documentSlug,
      weekNumber,
      yearNumber: now.getFullYear(),
    });
  }
}

export async function getWeeklyProgress(visitorId: string) {
  const db = await getDb();
  if (!db) return { docsRead: 0, target: 5, badges: [] };

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  const goal = await getReadingGoal(visitorId);
  const target = goal?.weeklyTarget ?? 5;

  const thisWeek = await db.select({ count: count() }).from(readingProgress)
    .where(and(
      eq(readingProgress.visitorId, visitorId),
      eq(readingProgress.weekNumber, weekNumber),
      eq(readingProgress.yearNumber, now.getFullYear()),
    ));

  const docsRead = thisWeek[0]?.count ?? 0;

  // Calculate badges based on total reads
  const totalReads = await db.select({ count: count() }).from(readingProgress)
    .where(eq(readingProgress.visitorId, visitorId));
  const total = totalReads[0]?.count ?? 0;

  const badges: string[] = [];
  if (total >= 5) badges.push('Bookworm');
  if (total >= 25) badges.push('Scholar');
  if (total >= 50) badges.push('Expert');
  if (total >= 100) badges.push('Master');
  if (docsRead >= target) badges.push('Weekly Goal Met');

  return { docsRead, target, badges, totalReads: total };
}

// ─── Document Templates Gallery ──────────────────────────────────────────

export async function getDocumentTemplates(category?: string) {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return db.select().from(documentTemplates)
      .where(eq(documentTemplates.category, category))
      .orderBy(desc(documentTemplates.usageCount));
  }
  return db.select().from(documentTemplates).orderBy(desc(documentTemplates.usageCount));
}

export async function createDocumentTemplate(data: { name: string; description?: string; category: string; content: string; icon?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(documentTemplates).values({
    name: data.name,
    description: data.description || null,
    category: data.category,
    content: data.content,
    icon: data.icon || null,
  });
  return { id: result[0].insertId };
}

export async function getDocumentTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(documentTemplates)
    .where(eq(documentTemplates.id, id))
    .limit(1);
  return result[0] || null;
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(documentTemplates)
    .set({ usageCount: sql`${documentTemplates.usageCount} + 1` })
    .where(eq(documentTemplates.id, id));
}

export async function deleteDocumentTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documentTemplates).where(eq(documentTemplates.id, id));
  return { success: true };
}

// ─── Document Audit Trail ────────────────────────────────────────────────────

export async function logAuditEntry(data: {
  documentSlug: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(documentAuditTrail).values({
    documentSlug: data.documentSlug,
    action: data.action,
    field: data.field || null,
    oldValue: data.oldValue || null,
    newValue: data.newValue || null,
    changedBy: data.changedBy || null,
  });
}

export async function getAuditTrail(slug: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(documentAuditTrail)
    .where(eq(documentAuditTrail.documentSlug, slug))
    .orderBy(sql`${documentAuditTrail.createdAt} DESC`)
    .limit(limit);
}

// ─── Analytics CSV Export ────────────────────────────────────────────────────

export async function getAnalyticsExportData() {
  const db = await getDb();
  if (!db) return { documents: [], downloads: [], views: [] };

  const docs = await db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    viewCount: documents.viewCount,
    upvotes: documents.upvotes,
    downvotes: documents.downvotes,
    wordCount: documents.wordCount,
    status: documents.status,
    locale: documents.locale,
    createdAt: documents.createdAt,
  }).from(documents).orderBy(sql`${documents.viewCount} DESC`);

  const downloads = await db.select({
    documentSlug: downloadHistory.documentSlug,
    format: downloadHistory.format,
    visitorId: downloadHistory.visitorId,
    createdAt: downloadHistory.createdAt,
  }).from(downloadHistory).orderBy(sql`${downloadHistory.createdAt} DESC`).limit(1000);

  return { documents: docs, downloads };
}

// ─── Related Documents AI ────────────────────────────────────────────────────

export async function getDocumentSummariesForAI(excludeSlug: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    summary: documents.summary,
  }).from(documents)
    .where(sql`${documents.slug} != ${excludeSlug} AND ${documents.status} = 'published'`)
    .limit(limit);
}

// ==================== Batch 11: Bookmark Notes ====================

export async function getBookmarkNotes(visitorId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookmarkNotes).where(eq(bookmarkNotes.visitorId, visitorId)).orderBy(desc(bookmarkNotes.updatedAt));
}

export async function getBookmarkNote(visitorId: string, documentSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(bookmarkNotes).where(and(eq(bookmarkNotes.visitorId, visitorId), eq(bookmarkNotes.documentSlug, documentSlug)));
  return rows[0] || null;
}

export async function upsertBookmarkNote(visitorId: string, documentSlug: string, note: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getBookmarkNote(visitorId, documentSlug);
  if (existing) {
    await db.update(bookmarkNotes).set({ note }).where(eq(bookmarkNotes.id, existing.id));
    return { ...existing, note };
  }
  const result = await db.insert(bookmarkNotes).values({ visitorId, documentSlug, note });
  return { id: Number(result[0].insertId), visitorId, documentSlug, note };
}

export async function deleteBookmarkNote(visitorId: string, documentSlug: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bookmarkNotes).where(and(eq(bookmarkNotes.visitorId, visitorId), eq(bookmarkNotes.documentSlug, documentSlug)));
}

// ==================== Batch 11: Share Links ====================

export async function createShareLink(documentSlug: string, token: string, expiresAt: Date, createdBy?: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(shareLinks).values({ documentSlug, token, expiresAt, createdBy });
  return { id: Number(result[0].insertId), documentSlug, token, expiresAt, createdBy };
}

export async function getShareLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token));
  return rows[0] || null;
}

export async function getShareLinksForDocument(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shareLinks).where(eq(shareLinks.documentSlug, documentSlug)).orderBy(desc(shareLinks.createdAt));
}

export async function incrementShareLinkAccess(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(shareLinks).set({ accessCount: sql`${shareLinks.accessCount} + 1` }).where(eq(shareLinks.token, token));
}

export async function deleteShareLink(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shareLinks).where(eq(shareLinks.id, id));
}

// ==================== Batch 11: Scheduled Publish ====================

export async function schedulePublish(documentSlug: string, publishAt: Date, createdBy?: string) {
  const db = await getDb();
  if (!db) return null;
  // Cancel any existing schedule for this doc
  await db.update(scheduledPublish).set({ status: 'cancelled' }).where(and(eq(scheduledPublish.documentSlug, documentSlug), eq(scheduledPublish.status, 'pending')));
  const result = await db.insert(scheduledPublish).values({ documentSlug, publishAt, createdBy });
  return { id: Number(result[0].insertId), documentSlug, publishAt, status: 'pending' };
}

export async function getScheduledPublishes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledPublish).where(eq(scheduledPublish.status, 'pending')).orderBy(asc(scheduledPublish.publishAt));
}

export async function getScheduledPublishForDoc(documentSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(scheduledPublish).where(and(eq(scheduledPublish.documentSlug, documentSlug), eq(scheduledPublish.status, 'pending')));
  return rows[0] || null;
}

export async function cancelScheduledPublish(documentSlug: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(scheduledPublish).set({ status: 'cancelled' }).where(and(eq(scheduledPublish.documentSlug, documentSlug), eq(scheduledPublish.status, 'pending')));
}

export async function processScheduledPublishes() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Find all pending items where publishAt <= now
  const due = await db.select().from(scheduledPublish).where(and(eq(scheduledPublish.status, 'pending'), sql`${scheduledPublish.publishAt} <= ${now}`));
  const published: string[] = [];
  for (const item of due) {
    await db.update(documents).set({ status: 'published' }).where(eq(documents.slug, item.documentSlug));
    await db.update(scheduledPublish).set({ status: 'published' }).where(eq(scheduledPublish.id, item.id));
    published.push(item.documentSlug);
  }
  return published;
}

// ==================== Batch 11: Bulk Tag Operations ====================

export async function renameTag(oldTag: string, newTag: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.update(documentTags).set({ tag: newTag }).where(eq(documentTags.tag, oldTag));
  return result[0]?.affectedRows || 0;
}

export async function mergeTags(sourceTag: string, targetTag: string) {
  const db = await getDb();
  if (!db) return 0;
  // Get all docs with source tag
  const sourceDocs = await db.select().from(documentTags).where(eq(documentTags.tag, sourceTag));
  // Get all docs with target tag already
  const targetDocs = await db.select().from(documentTags).where(eq(documentTags.tag, targetTag));
  const targetSlugs = new Set(targetDocs.map(d => d.documentSlug));
  
  let merged = 0;
  for (const doc of sourceDocs) {
    if (!targetSlugs.has(doc.documentSlug)) {
      // Move to target tag
      await db.update(documentTags).set({ tag: targetTag }).where(eq(documentTags.id, doc.id));
      merged++;
    } else {
      // Already has target tag, just delete source
      await db.delete(documentTags).where(eq(documentTags.id, doc.id));
    }
  }
  return merged;
}

export async function deleteTagGlobally(tag: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.delete(documentTags).where(eq(documentTags.tag, tag));
  return result[0]?.affectedRows || 0;
}

export async function getAllTagsWithCounts() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ tag: documentTags.tag, count: count() }).from(documentTags).groupBy(documentTags.tag).orderBy(desc(count()));
  return rows;
}

// ==================== Batch 11: Import from URL ====================

export async function importDocumentFromContent(slug: string, title: string, category: string, content: string, locale?: string) {
  const db = await getDb();
  if (!db) return null;
  const filename = `ARG-Builder-${slug}.md`;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const result = await db.insert(documents).values({ slug, title, category, filename, content, wordCount, status: 'draft', locale: locale || 'en' });
  return { id: Number(result[0].insertId), slug, title, category, wordCount };
}

// ==================== Batch 11: Approval Queue ====================

export async function getDocumentsInReview() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.status, 'review')).orderBy(desc(documents.updatedAt));
}

export async function approveDocument(slug: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents).set({ status: 'published' }).where(eq(documents.slug, slug));
}

export async function rejectDocument(slug: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents).set({ status: 'draft' }).where(eq(documents.slug, slug));
}

// ─── Batch 12: Inline Comments ─────────────────────────────────────────────

export async function getInlineComments(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inlineComments).where(eq(inlineComments.documentSlug, documentSlug)).orderBy(asc(inlineComments.createdAt));
}

export async function addInlineComment(data: { documentSlug: string; visitorId: string; highlightText: string; comment: string; parentId?: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(inlineComments).values({
    documentSlug: data.documentSlug,
    visitorId: data.visitorId,
    highlightText: data.highlightText,
    comment: data.comment,
    parentId: data.parentId || null,
  });
  return { id: result[0].insertId };
}

export async function resolveInlineComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(inlineComments).set({ resolved: 1 }).where(eq(inlineComments.id, id));
  return { success: true };
}

export async function deleteInlineComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(inlineComments).where(eq(inlineComments.id, id));
  return { success: true };
}

// ─── Batch 12: Branding Settings ───────────────────────────────────────────

export async function getBrandingSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brandingSettings).orderBy(asc(brandingSettings.settingKey));
}

export async function upsertBrandingSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(brandingSettings).values({ settingKey: key, settingValue: value }).onDuplicateKeyUpdate({ set: { settingValue: value } });
  return { success: true };
}

// ─── Batch 12: Webhooks ────────────────────────────────────────────────────

export async function getWebhooks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
}

export async function createWebhook(data: { url: string; events: string; secret?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(webhooks).values({ url: data.url, events: data.events, secret: data.secret || null });
  return { id: result[0].insertId };
}

export async function updateWebhook(id: number, data: { url?: string; events?: string; active?: number; secret?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const updateSet: Record<string, unknown> = {};
  if (data.url !== undefined) updateSet.url = data.url;
  if (data.events !== undefined) updateSet.events = data.events;
  if (data.active !== undefined) updateSet.active = data.active;
  if (data.secret !== undefined) updateSet.secret = data.secret;
  await db.update(webhooks).set(updateSet).where(eq(webhooks.id, id));
  return { success: true };
}

export async function deleteWebhook(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(webhooks).where(eq(webhooks.id, id));
  return { success: true };
}

export async function getActiveWebhooksForEvent(event: string) {
  const db = await getDb();
  if (!db) return [];
  const all = await db.select().from(webhooks).where(eq(webhooks.active, 1));
  return all.filter(w => {
    try {
      const events = JSON.parse(w.events) as string[];
      return events.includes(event) || events.includes('*');
    } catch { return false; }
  });
}

export async function markWebhookTriggered(id: number, success: boolean) {
  const db = await getDb();
  if (!db) return;
  if (success) {
    await db.update(webhooks).set({ lastTriggeredAt: new Date(), failCount: 0 }).where(eq(webhooks.id, id));
  } else {
    await db.update(webhooks).set({ failCount: sql`${webhooks.failCount} + 1` }).where(eq(webhooks.id, id));
  }
}

// ─── Batch 12: Recently Viewed ─────────────────────────────────────────────

export async function trackRecentlyViewed(visitorId: string, documentSlug: string) {
  const db = await getDb();
  if (!db) return;
  // Delete existing entry for this visitor+doc combo
  await db.delete(recentlyViewed).where(and(eq(recentlyViewed.visitorId, visitorId), eq(recentlyViewed.documentSlug, documentSlug)));
  // Insert new entry
  await db.insert(recentlyViewed).values({ visitorId, documentSlug });
  // Keep only last 20 entries per visitor
  const all = await db.select({ id: recentlyViewed.id }).from(recentlyViewed).where(eq(recentlyViewed.visitorId, visitorId)).orderBy(desc(recentlyViewed.viewedAt));
  if (all.length > 20) {
    const idsToDelete = all.slice(20).map(r => r.id);
    for (const id of idsToDelete) {
      await db.delete(recentlyViewed).where(eq(recentlyViewed.id, id));
    }
  }
}

export async function getRecentlyViewed(visitorId: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(recentlyViewed).where(eq(recentlyViewed.visitorId, visitorId)).orderBy(desc(recentlyViewed.viewedAt)).limit(limit);
  // Join with documents to get titles
  if (rows.length === 0) return [];
  const slugs = rows.map(r => r.documentSlug);
  const docs = await db.select({ slug: documents.slug, title: documents.title, category: documents.category }).from(documents).where(sql`${documents.slug} IN (${sql.join(slugs.map(s => sql`${s}`), sql`, `)})`);
  const docMap = new Map(docs.map(d => [d.slug, d]));
  return rows.map(r => ({ ...r, document: docMap.get(r.documentSlug) || null }));
}

// ─── Batch 12: Document Export to DOCX ─────────────────────────────────────

export async function getDocumentForExport(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ title: documents.title, content: documents.content, category: documents.category, slug: documents.slug }).from(documents).where(eq(documents.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Batch 12: Admin User Management ───────────────────────────────────────

export async function getAllUsers(opts: { limit?: number; offset?: number; search?: string } = {}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const { limit = 50, offset = 0, search } = opts;
  
  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(sql`(${users.name} LIKE ${pattern} OR ${users.email} LIKE ${pattern} OR ${users.openId} LIKE ${pattern})`);
  }
  
  const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;
  
  const countResult = whereClause
    ? await db.select({ total: count() }).from(users).where(whereClause)
    : await db.select({ total: count() }).from(users);
  const total = countResult[0]?.total ?? 0;
  
  const rows = whereClause
    ? await db.select().from(users).where(whereClause).orderBy(desc(users.lastSignedIn)).limit(limit).offset(offset)
    : await db.select().from(users).orderBy(desc(users.lastSignedIn)).limit(limit).offset(offset);
  
  return { users: rows, total };
}

export async function updateUserRole(openId: string, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users).set({ role }).where(eq(users.openId, openId));
  return { success: true };
}

// ─── Batch 12: Visitor Analytics (per-user access tracking) ────────────────

export async function getVisitorAnalytics(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // Get most active visitors by view count from activity log
  const result = await db.select({
    visitorId: activityLog.visitorId,
    actionCount: count(),
  }).from(activityLog).groupBy(activityLog.visitorId).orderBy(desc(count())).limit(limit);
  return result;
}

// ─── Batch 12: Document Archive/Restore ────────────────────────────────────

export async function archiveDocuments(slugs: string[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  for (const slug of slugs) {
    await db.update(documents).set({ status: 'draft' }).where(eq(documents.slug, slug));
  }
  return { archived: slugs.length };
}

export async function restoreDocuments(slugs: string[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  for (const slug of slugs) {
    await db.update(documents).set({ status: 'published' }).where(eq(documents.slug, slug));
  }
  return { restored: slugs.length };
}

export async function getVisitorDocumentAccess(visitorId: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    documentSlug: activityLog.documentSlug,
    action: activityLog.action,
    createdAt: activityLog.createdAt,
  }).from(activityLog).where(eq(activityLog.visitorId, visitorId)).orderBy(desc(activityLog.createdAt)).limit(50);
  return rows;
}

// ─── Batch 12: Fire Webhooks ───────────────────────────────────────────────

export async function fireWebhooks(event: string, payload: Record<string, unknown>) {
  const hooks = await getActiveWebhooksForEvent(event);
  for (const hook of hooks) {
    try {
      const response = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}),
        },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });
      await markWebhookTriggered(hook.id, response.ok);
    } catch {
      await markWebhookTriggered(hook.id, false);
    }
  }
}

// ─── Document Feedback ──────────────────────────────────────────────────────

export async function submitFeedback(data: { documentSlug: string; visitorId: string; sentiment: 'positive' | 'negative'; comment?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Upsert - one feedback per visitor per doc
  const existing = await db.select().from(documentFeedback)
    .where(and(eq(documentFeedback.documentSlug, data.documentSlug), eq(documentFeedback.visitorId, data.visitorId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(documentFeedback)
      .set({ sentiment: data.sentiment, comment: data.comment || null })
      .where(eq(documentFeedback.id, existing[0].id));
  } else {
    await db.insert(documentFeedback).values({
      documentSlug: data.documentSlug,
      visitorId: data.visitorId,
      sentiment: data.sentiment,
      comment: data.comment || null,
    });
  }
  return { success: true };
}

export async function getFeedbackForDocument(slug: string) {
  const db = await getDb();
  if (!db) return { positive: 0, negative: 0, comments: [] };

  const rows = await db.select().from(documentFeedback)
    .where(eq(documentFeedback.documentSlug, slug))
    .orderBy(desc(documentFeedback.createdAt));

  const positive = rows.filter(r => r.sentiment === 'positive').length;
  const negative = rows.filter(r => r.sentiment === 'negative').length;
  const comments = rows.filter(r => r.comment).map(r => ({ visitorId: r.visitorId, comment: r.comment!, sentiment: r.sentiment, createdAt: r.createdAt }));

  return { positive, negative, comments };
}

export async function getMyFeedback(slug: string, visitorId: string) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(documentFeedback)
    .where(and(eq(documentFeedback.documentSlug, slug), eq(documentFeedback.visitorId, visitorId)))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

// ─── Category Ordering ──────────────────────────────────────────────────────

export async function getCategoryOrdering() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(categoryOrdering).orderBy(asc(categoryOrdering.sortOrder));
}

export async function saveCategoryOrdering(categories: { name: string; sortOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Delete all existing and re-insert
  await db.delete(categoryOrdering).where(sql`1=1`);
  if (categories.length > 0) {
    for (const cat of categories) {
      await db.insert(categoryOrdering).values({ categoryName: cat.name, sortOrder: cat.sortOrder });
    }
  }
  return { success: true };
}

// ─── Document Duplication ───────────────────────────────────────────────────

export async function duplicateDocument(slug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const original = await getDocumentBySlug(slug);
  if (!original) throw new Error('Document not found');

  const newSlug = `Copy-of-${original.slug}-${Date.now()}`;
  const newTitle = `Copy of ${original.title}`;

  await db.insert(documents).values({
    slug: newSlug,
    title: newTitle,
    category: original.category,
    filename: `copy-${original.filename}`,
    content: original.content,
    wordCount: original.wordCount,
    status: 'draft',
    locale: original.locale,
  });

  return getDocumentBySlug(newSlug);
}

// ─── Reading History ────────────────────────────────────────────────────────

export async function getReadingHistory(visitorId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    documentSlug: recentlyViewed.documentSlug,
    viewedAt: recentlyViewed.viewedAt,
  }).from(recentlyViewed)
    .where(eq(recentlyViewed.visitorId, visitorId))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(limit);

  // Enrich with document titles
  if (rows.length === 0) return [];

  const slugs = rows.map(r => r.documentSlug);
  const docs = await db.select({ slug: documents.slug, title: documents.title, category: documents.category, wordCount: documents.wordCount })
    .from(documents)
    .where(sql`${documents.slug} IN (${sql.join(slugs.map(s => sql`${s}`), sql`, `)})`);

  const docMap = new Map(docs.map(d => [d.slug, d]));

  return rows.map(r => ({
    ...r,
    title: docMap.get(r.documentSlug)?.title || r.documentSlug,
    category: docMap.get(r.documentSlug)?.category || '',
    wordCount: docMap.get(r.documentSlug)?.wordCount || 0,
  }));
}

// ==================== Batch 14 ====================

// ─── Document Visibility / Access Control ─────────────────────────────────

export async function setDocumentVisibility(slug: string, visibility: 'public' | 'private') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(documents).set({ visibility }).where(eq(documents.slug, slug));
  return { success: true };
}

export async function getPrivateDocuments(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ slug: documents.slug, title: documents.title, category: documents.category, wordCount: documents.wordCount })
    .from(documents)
    .where(eq(documents.visibility, 'private'))
    .orderBy(asc(documents.title))
    .limit(limit);
}

// ─── Document Collections / Playlists ─────────────────────────────────────

export async function getCollections(opts: { publishedOnly?: boolean } = {}) {
  const db = await getDb();
  if (!db) return [];
  if (opts.publishedOnly) {
    return db.select().from(documentCollections).where(eq(documentCollections.isPublished, 1)).orderBy(desc(documentCollections.updatedAt));
  }
  return db.select().from(documentCollections).orderBy(desc(documentCollections.updatedAt));
}

export async function getCollectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentCollections).where(eq(documentCollections.id, id)).limit(1);
  return rows[0] || null;
}

export async function createCollection(data: { name: string; description?: string; coverColor?: string; createdBy?: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(documentCollections).values({
    name: data.name,
    description: data.description || null,
    coverColor: data.coverColor || '#c9a96e',
    createdBy: data.createdBy || null,
  });
  return { id: Number(result[0].insertId) };
}

export async function updateCollection(id: number, data: { name?: string; description?: string; coverColor?: string; isPublished?: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.coverColor !== undefined) updateSet.coverColor = data.coverColor;
  if (data.isPublished !== undefined) updateSet.isPublished = data.isPublished;
  if (Object.keys(updateSet).length === 0) return { success: true };
  await db.update(documentCollections).set(updateSet).where(eq(documentCollections.id, id));
  return { success: true };
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
  await db.delete(documentCollections).where(eq(documentCollections.id, id));
  return { success: true };
}

export async function getCollectionItems(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: collectionItems.id,
    documentSlug: collectionItems.documentSlug,
    sortOrder: collectionItems.sortOrder,
    title: documents.title,
    category: documents.category,
    wordCount: documents.wordCount,
  })
    .from(collectionItems)
    .innerJoin(documents, eq(collectionItems.documentSlug, documents.slug))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(asc(collectionItems.sortOrder));
}

export async function addCollectionItem(collectionId: number, documentSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Get max sort order
  const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(${collectionItems.sortOrder}), 0)` })
    .from(collectionItems).where(eq(collectionItems.collectionId, collectionId));
  const nextOrder = (maxOrder[0]?.max ?? 0) + 1;
  await db.insert(collectionItems).values({ collectionId, documentSlug, sortOrder: nextOrder });
  return { success: true };
}

export async function removeCollectionItem(collectionId: number, documentSlug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(collectionItems).where(and(eq(collectionItems.collectionId, collectionId), eq(collectionItems.documentSlug, documentSlug)));
  return { success: true };
}

// ─── Bulk Import from JSON ────────────────────────────────────────────────

export async function bulkImportFromJSON(docs: Array<{ title: string; category: string; content: string; status?: string; locale?: string }>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results: Array<{ title: string; status: string; error?: string; slug?: string }> = [];
  for (const doc of docs) {
    const slug = doc.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 250);
    const wordCount = doc.content.split(/\s+/).filter(Boolean).length;
    try {
      await db.insert(documents).values({
        slug,
        title: doc.title,
        category: doc.category,
        filename: `${slug}.md`,
        content: doc.content,
        wordCount,
        status: (doc.status as 'draft' | 'review' | 'published') || 'draft',
        locale: doc.locale || 'en',
      });
      results.push({ title: doc.title, status: 'created', slug });
    } catch (err: any) {
      results.push({ title: doc.title, status: 'error', error: err.message });
    }
  }
  return results;
}

// ─── Document Version Restore ─────────────────────────────────────────────

export async function restoreDocumentVersion(slug: string, versionId: number, restoredBy?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get the version to restore
  const version = await db.select().from(documentVersions).where(eq(documentVersions.id, versionId)).limit(1);
  if (version.length === 0) throw new Error('Version not found');

  const versionData = version[0];

  // Save current state as a new version before restoring
  const current = await getDocumentBySlug(slug);
  if (current) {
    await saveDocumentVersion(slug, current.title, current.content || '', restoredBy, 'Auto-saved before restore');
  }

  // Restore the document to the selected version
  const updateSet: Record<string, unknown> = {};
  if (versionData.title) updateSet.title = versionData.title;
  if (versionData.content) {
    updateSet.content = versionData.content;
    updateSet.wordCount = versionData.content.split(/\s+/).filter(Boolean).length;
  }

  if (Object.keys(updateSet).length > 0) {
    await db.update(documents).set(updateSet).where(eq(documents.slug, slug));
  }

  return { success: true, restoredFrom: versionId };
}

// ─── Reading Time Heatmap ─────────────────────────────────────────────────

export async function getReadingHeatmap(days = 30) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    hour: sql<number>`HOUR(${activityLog.createdAt})`,
    dayOfWeek: sql<number>`DAYOFWEEK(${activityLog.createdAt})`,
    count: count(),
  })
    .from(activityLog)
    .where(sql`${activityLog.action} = 'view' AND ${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`HOUR(${activityLog.createdAt})`, sql`DAYOFWEEK(${activityLog.createdAt})`)
    .orderBy(sql`DAYOFWEEK(${activityLog.createdAt})`, sql`HOUR(${activityLog.createdAt})`);
}

// ─── Batch 15: Document Subscriptions ────────────────────────────────────────
export async function subscribeToTarget(userOpenId: string, targetType: 'document' | 'category', targetValue: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(documentSubscriptions)
    .where(and(eq(documentSubscriptions.userOpenId, userOpenId), eq(documentSubscriptions.targetType, targetType), eq(documentSubscriptions.targetValue, targetValue)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(documentSubscriptions).values({ userOpenId, targetType, targetValue });
  return { userOpenId, targetType, targetValue };
}

export async function unsubscribeFromTarget(userOpenId: string, targetType: 'document' | 'category', targetValue: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documentSubscriptions)
    .where(and(eq(documentSubscriptions.userOpenId, userOpenId), eq(documentSubscriptions.targetType, targetType), eq(documentSubscriptions.targetValue, targetValue)));
}

export async function getUserSubscriptions(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentSubscriptions).where(eq(documentSubscriptions.userOpenId, userOpenId)).orderBy(desc(documentSubscriptions.createdAt));
}

export async function notifySubscribers(documentSlug: string, category: string, changeType: 'created' | 'updated' | 'published') {
  const db = await getDb();
  if (!db) return;
  const subs = await db.select().from(documentSubscriptions)
    .where(or(
      and(eq(documentSubscriptions.targetType, 'document'), eq(documentSubscriptions.targetValue, documentSlug)),
      and(eq(documentSubscriptions.targetType, 'category'), eq(documentSubscriptions.targetValue, category))
    ));
  if (subs.length === 0) return;
  const notifications = subs.map(s => ({ userOpenId: s.userOpenId, documentSlug, changeType, isRead: 0 }));
  await db.insert(subscriptionNotifications).values(notifications);
}

export async function getUserNotifications(userOpenId: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: subscriptionNotifications.id,
    documentSlug: subscriptionNotifications.documentSlug,
    changeType: subscriptionNotifications.changeType,
    isRead: subscriptionNotifications.isRead,
    createdAt: subscriptionNotifications.createdAt,
  }).from(subscriptionNotifications)
    .where(eq(subscriptionNotifications.userOpenId, userOpenId))
    .orderBy(desc(subscriptionNotifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number, userOpenId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptionNotifications).set({ isRead: 1 }).where(and(eq(subscriptionNotifications.id, id), eq(subscriptionNotifications.userOpenId, userOpenId)));
}

export async function markAllNotificationsRead(userOpenId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptionNotifications).set({ isRead: 1 }).where(eq(subscriptionNotifications.userOpenId, userOpenId));
}

export async function getUnreadNotificationCount(userOpenId: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: count() }).from(subscriptionNotifications)
    .where(and(eq(subscriptionNotifications.userOpenId, userOpenId), eq(subscriptionNotifications.isRead, 0)));
  return result[0]?.total ?? 0;
}

// ─── Batch 15: Reading Progress (server-side) ────────────────────────────────
export async function saveReadingPosition(userOpenId: string, documentSlug: string, scrollPercent: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(userReadingPosition)
    .where(and(eq(userReadingPosition.userOpenId, userOpenId), eq(userReadingPosition.documentSlug, documentSlug)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(userReadingPosition).set({ scrollPercent, lastReadAt: new Date() })
      .where(eq(userReadingPosition.id, existing[0].id));
  } else {
    await db.insert(userReadingPosition).values({ userOpenId, documentSlug, scrollPercent });
  }
}

export async function getReadingPosition(userOpenId: string, documentSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userReadingPosition)
    .where(and(eq(userReadingPosition.userOpenId, userOpenId), eq(userReadingPosition.documentSlug, documentSlug)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllReadingPositions(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userReadingPosition)
    .where(eq(userReadingPosition.userOpenId, userOpenId))
    .orderBy(desc(userReadingPosition.lastReadAt))
    .limit(50);
}

// ─── Batch 15: Bulk Move Documents Between Categories ────────────────────────
export async function bulkMoveDocuments(slugs: string[], newCategory: string) {
  const db = await getDb();
  if (!db) return { moved: 0 };
  let moved = 0;
  for (const slug of slugs) {
    await db.update(documents).set({ category: newCategory }).where(eq(documents.slug, slug));
    moved++;
  }
  return { moved };
}

// ─── Batch 15: Document Merge ────────────────────────────────────────────────
export async function mergeDocuments(sourceSlug: string, targetSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const [source] = await db.select().from(documents).where(eq(documents.slug, sourceSlug)).limit(1);
  const [target] = await db.select().from(documents).where(eq(documents.slug, targetSlug)).limit(1);
  if (!source || !target) return null;
  const mergedContent = `${target.content || ''}\n\n---\n\n## Merged from: ${source.title}\n\n${source.content || ''}`;
  const mergedWordCount = (target.wordCount || 0) + (source.wordCount || 0);
  await db.update(documents).set({ content: mergedContent, wordCount: mergedWordCount }).where(eq(documents.slug, targetSlug));
  return { targetSlug, mergedWordCount };
}

// ─── Batch 15: Category Cover Images ────────────────────────────────────────
export async function setCategoryCoverImage(categoryName: string, imageUrl: string) {
  const db = await getDb();
  if (!db) return;
  const key = `category_cover_${categoryName}`;
  const existing = await db.select().from(brandingSettings).where(eq(brandingSettings.settingKey, key)).limit(1);
  if (existing.length > 0) {
    await db.update(brandingSettings).set({ settingValue: imageUrl }).where(eq(brandingSettings.settingKey, key));
  } else {
    await db.insert(brandingSettings).values({ settingKey: key, settingValue: imageUrl });
  }
}

export async function getCategoryCoverImage(categoryName: string) {
  const db = await getDb();
  if (!db) return null;
  const key = `category_cover_${categoryName}`;
  const result = await db.select().from(brandingSettings).where(eq(brandingSettings.settingKey, key)).limit(1);
  return result.length > 0 ? result[0].settingValue : null;
}

export async function getAllCategoryCoverImages() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(brandingSettings).where(like(brandingSettings.settingKey, 'category_cover_%'));
  return result.map(r => ({ category: r.settingKey.replace('category_cover_', ''), imageUrl: r.settingValue }));
}

// ─── Batch 15: Search History ────────────────────────────────────────────────
export async function saveSearchHistory(userOpenId: string, query: string, resultCount: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchHistory).values({ userOpenId, query, resultCount });
}

export async function getRecentSearches(userOpenId: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(searchHistory)
    .where(eq(searchHistory.userOpenId, userOpenId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limit);
}

export async function clearUserSearchHistory(userOpenId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(searchHistory).where(eq(searchHistory.userOpenId, userOpenId));
}

// ─── Batch 15: Document Relationships Graph Data ─────────────────────────────
export async function getDocumentGraph() {
  const db = await getDb();
  if (!db) return { nodes: [], edges: [] };
  const docs = await db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    wordCount: documents.wordCount,
  }).from(documents).where(eq(documents.status, 'published'));
  
  const deps = await db.select({
    source: sql<string>`documentSlug`,
    target: sql<string>`dependsOnSlug`,
  }).from(sql`document_dependencies`);
  
  const nodes = docs.map(d => ({ id: d.slug, label: d.title, category: d.category, size: d.wordCount || 100 }));
  const edges = deps.map(d => ({ source: d.source, target: d.target }));
  return { nodes, edges };
}

// ─── Batch 15: Admin Content Calendar ────────────────────────────────────────
export async function getContentCalendarEvents(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  const created = await db.select({
    id: documents.id,
    title: documents.title,
    slug: documents.slug,
    date: documents.createdAt,
    type: sql<string>`'created'`,
  }).from(documents)
    .where(sql`${documents.createdAt} >= ${startDate} AND ${documents.createdAt} <= ${endDate}`);
  
  const scheduled = await db.select({
    id: scheduledPublish.id,
    title: sql<string>`(SELECT title FROM documents WHERE slug = ${scheduledPublish.documentSlug} LIMIT 1)`,
    slug: scheduledPublish.documentSlug,
    date: scheduledPublish.publishAt,
    type: sql<string>`'scheduled'`,
  }).from(scheduledPublish)
    .where(sql`${scheduledPublish.publishAt} >= ${startDate} AND ${scheduledPublish.publishAt} <= ${endDate}`);
  
  const reviews = await db.select({
    id: documents.id,
    title: documents.title,
    slug: documents.slug,
    date: documents.reviewBy,
    type: sql<string>`'review_due'`,
  }).from(documents)
    .where(sql`${documents.reviewBy} IS NOT NULL AND ${documents.reviewBy} >= ${startDate} AND ${documents.reviewBy} <= ${endDate}`);
  
  return [...created, ...scheduled, ...reviews];
}

// ===== BATCH 16: AI Summaries =====
export async function saveAISummary(documentSlug: string, summary: string, language: string = 'en') {
  const db = await getDb();
  if (!db) return null;
  // Upsert: delete existing then insert
  await db.delete(aiSummaries).where(and(eq(aiSummaries.documentSlug, documentSlug), eq(aiSummaries.language, language)));
  const [result] = await db.insert(aiSummaries).values({ documentSlug, summary, language }).$returningId();
  return result;
}

export async function getAISummary(documentSlug: string, language: string = 'en') {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(aiSummaries)
    .where(and(eq(aiSummaries.documentSlug, documentSlug), eq(aiSummaries.language, language)))
    .limit(1);
  return rows[0] || null;
}

// ===== BATCH 16: Document Translations =====
export async function saveTranslation(documentSlug: string, language: string, translatedTitle: string, translatedContent: string) {
  const db = await getDb();
  if (!db) return null;
  await db.delete(documentTranslations).where(and(eq(documentTranslations.documentSlug, documentSlug), eq(documentTranslations.language, language)));
  const [result] = await db.insert(documentTranslations).values({ documentSlug, language, translatedTitle, translatedContent }).$returningId();
  return result;
}

export async function getTranslation(documentSlug: string, language: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentTranslations)
    .where(and(eq(documentTranslations.documentSlug, documentSlug), eq(documentTranslations.language, language)))
    .limit(1);
  return rows[0] || null;
}

export async function getTranslationsForDocument(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ language: documentTranslations.language, translatedTitle: documentTranslations.translatedTitle, createdAt: documentTranslations.createdAt })
    .from(documentTranslations)
    .where(eq(documentTranslations.documentSlug, documentSlug));
}

// ===== BATCH 16: User Preferences =====
export async function getUserPreferences(userOpenId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userOpenId, userOpenId)).limit(1);
  return rows[0] || null;
}

export async function saveUserPreferences(userOpenId: string, prefs: { notificationFrequency?: string; defaultSort?: string; readingSpeedWpm?: number; preferredTheme?: string }) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getUserPreferences(userOpenId);
  if (existing) {
    await db.update(userPreferences).set(prefs as any).where(eq(userPreferences.userOpenId, userOpenId));
  } else {
    await db.insert(userPreferences).values({ userOpenId, ...prefs } as any);
  }
  return getUserPreferences(userOpenId);
}

// ===== BATCH 16: Pinned Documents (uses existing getPinnedDocuments) =====

// ===== BATCH 16: Word Count Analytics =====
export async function getWordCountAnalytics() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    category: documents.category,
    totalWords: sql<number>`SUM(${documents.wordCount})`.as('totalWords'),
    docCount: sql<number>`COUNT(*)`.as('docCount'),
    avgWords: sql<number>`ROUND(AVG(${documents.wordCount}))`.as('avgWords'),
    maxWords: sql<number>`MAX(${documents.wordCount})`.as('maxWords'),
    minWords: sql<number>`MIN(${documents.wordCount})`.as('minWords'),
  }).from(documents).groupBy(documents.category).orderBy(desc(sql`totalWords`));
}

// ===== BATCH 16: Broken Links Checker =====
export async function getAllDocumentLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ slug: documents.slug, title: documents.title, content: documents.content })
    .from(documents)
    .where(eq(documents.status, 'published'));
}

// ===== BATCH 16: Reading Streak Leaderboard =====
export async function getReadingStreakLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(readingStreakLeaderboard)
    .orderBy(desc(readingStreakLeaderboard.currentStreak))
    .limit(limit);
}

export async function updateStreakLeaderboard(userOpenId: string, userName: string, currentStreak: number, longestStreak: number, totalDocsRead: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(readingStreakLeaderboard).where(eq(readingStreakLeaderboard.userOpenId, userOpenId)).limit(1);
  if (existing.length > 0) {
    await db.update(readingStreakLeaderboard).set({ userName, currentStreak, longestStreak, totalDocsRead }).where(eq(readingStreakLeaderboard.userOpenId, userOpenId));
  } else {
    await db.insert(readingStreakLeaderboard).values({ userOpenId, userName, currentStreak, longestStreak, totalDocsRead });
  }
}

// ===== BATCH 16: Document Changelog Diff =====
export async function getDocumentVersionsForDiff(documentSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: documentAuditTrail.id,
    field: documentAuditTrail.field,
    oldValue: documentAuditTrail.oldValue,
    newValue: documentAuditTrail.newValue,
    changedBy: documentAuditTrail.changedBy,
    createdAt: documentAuditTrail.createdAt,
  }).from(documentAuditTrail)
    .where(and(eq(documentAuditTrail.documentSlug, documentSlug), eq(documentAuditTrail.field, 'content')))
    .orderBy(desc(documentAuditTrail.createdAt))
    .limit(20);
}


// ==================== Batch 17 ====================

// ─── Saved Filters ────────────────────────────────────────────────────────
export async function getSavedFilters(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedFilters)
    .where(eq(savedFilters.userOpenId, userOpenId))
    .orderBy(desc(savedFilters.createdAt));
}

export async function createSavedFilter(userOpenId: string, name: string, filterConfig: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(savedFilters).values({ userOpenId, name, filterConfig });
}

export async function deleteSavedFilter(id: number, userOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(savedFilters).where(and(eq(savedFilters.id, id), eq(savedFilters.userOpenId, userOpenId)));
}

// ─── Document Quizzes ─────────────────────────────────────────────────────
export async function getDocumentQuiz(documentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentQuizzes)
    .where(eq(documentQuizzes.documentId, documentId))
    .orderBy(desc(documentQuizzes.generatedAt))
    .limit(1);
  return rows[0] || null;
}

export async function saveDocumentQuiz(documentId: number, questions: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Delete old quiz for this doc
  await db.delete(documentQuizzes).where(eq(documentQuizzes.documentId, documentId));
  await db.insert(documentQuizzes).values({ documentId, questions });
}

// ─── Review Reminders ─────────────────────────────────────────────────────
export async function getReviewReminders() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: reviewReminders.id,
    documentId: reviewReminders.documentId,
    reviewDate: reviewReminders.reviewDate,
    frequency: reviewReminders.frequency,
    lastNotified: reviewReminders.lastNotified,
    createdAt: reviewReminders.createdAt,
  }).from(reviewReminders).orderBy(asc(reviewReminders.reviewDate));
}

export async function createReviewReminder(documentId: number, reviewDate: Date, frequency: 'once' | 'weekly' | 'monthly' | 'quarterly') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(reviewReminders).values({ documentId, reviewDate, frequency });
}

export async function deleteReviewReminder(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(reviewReminders).where(eq(reviewReminders.id, id));
}

export async function getOverdueReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    reminderId: reviewReminders.id,
    documentId: reviewReminders.documentId,
    reviewDate: reviewReminders.reviewDate,
    frequency: reviewReminders.frequency,
    docTitle: documents.title,
    docSlug: documents.slug,
  }).from(reviewReminders)
    .innerJoin(documents, eq(reviewReminders.documentId, documents.id))
    .where(sql`${reviewReminders.reviewDate} <= NOW()`)
    .orderBy(asc(reviewReminders.reviewDate));
}

// ─── Document Annotations ─────────────────────────────────────────────────
export async function getDocumentAnnotations(documentId: number, userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentAnnotations)
    .where(and(eq(documentAnnotations.documentId, documentId), eq(documentAnnotations.userOpenId, userOpenId)))
    .orderBy(asc(documentAnnotations.startOffset));
}

export async function createAnnotation(data: { documentId: number; userOpenId: string; highlightText: string; note?: string; color: string; startOffset: number; endOffset: number }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.insert(documentAnnotations).values(data);
}

export async function deleteAnnotation(id: number, userOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(documentAnnotations).where(and(eq(documentAnnotations.id, id), eq(documentAnnotations.userOpenId, userOpenId)));
}

export async function updateAnnotationNote(id: number, userOpenId: string, note: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(documentAnnotations)
    .set({ note })
    .where(and(eq(documentAnnotations.id, id), eq(documentAnnotations.userOpenId, userOpenId)));
}

// ─── Admin Bulk Tag Assignment ────────────────────────────────────────────
export async function bulkAssignTags(documentSlugs: string[], tags: string[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const values = documentSlugs.flatMap(slug =>
    tags.map(tag => ({ documentSlug: slug, tag }))
  );
  if (values.length > 0) {
    await db.execute(sql`INSERT IGNORE INTO document_tags (documentSlug, tag) VALUES ${sql.join(values.map(v => sql`(${v.documentSlug}, ${v.tag})`), sql`,`)}`);
  }
}

export async function bulkRemoveTags(documentSlugs: string[], tags: string[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  for (const tag of tags) {
    await db.delete(documentTags).where(
      and(
        sql`${documentTags.documentSlug} IN (${sql.join(documentSlugs.map(s => sql`${s}`), sql`,`)})`,
        eq(documentTags.tag, tag)
      )
    );
  }
}

// ─── Content Health Score ─────────────────────────────────────────────────
export async function getContentHealthScores() {
  const db = await getDb();
  if (!db) return [];
  // Get all documents with their metadata
  const docs = await db.select({
    id: documents.id,
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    wordCount: documents.wordCount,
    updatedAt: documents.updatedAt,
    viewCount: documents.viewCount,
    upvotes: documents.upvotes,
    downvotes: documents.downvotes,
  }).from(documents).orderBy(desc(documents.updatedAt));
  return docs;
}

// ─── Related Documents by Tag Similarity ──────────────────────────────────────────
export async function getRelatedByTags(documentSlug: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  // Get tags for this document
  const docTags = await db.select({ tag: documentTags.tag }).from(documentTags)
    .where(eq(documentTags.documentSlug, documentSlug));
  if (docTags.length === 0) return [];
  const tagValues = docTags.map(t => t.tag);
  // Find other documents sharing these tags, ranked by overlap count
  const related = await db.execute(sql`
    SELECT dt.documentSlug, d.title, d.slug, d.category, COUNT(*) as sharedTags
    FROM document_tags dt
    INNER JOIN documents d ON d.slug = dt.documentSlug
    WHERE dt.tag IN (${sql.join(tagValues.map(t => sql`${t}`), sql`,`)})
      AND dt.documentSlug != ${documentSlug}
    GROUP BY dt.documentSlug, d.title, d.slug, d.category
    ORDER BY sharedTags DESC
    LIMIT ${limit}
  `);
  return (related as any)[0] || [];
}
// ============ BATCH 18 HELPERS ============

// --- Custom Workflow Statuses ---
export async function getWorkflowStatuses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowStatuses).orderBy(asc(workflowStatuses.sortOrder));
}

export async function createWorkflowStatus(data: { name: string; color: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workflowStatuses).values(data);
}

export async function deleteWorkflowStatus(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(workflowTransitions).where(or(eq(workflowTransitions.fromStatusId, id), eq(workflowTransitions.toStatusId, id)));
  await db.delete(documentWorkflowStatus).where(eq(documentWorkflowStatus.statusId, id));
  await db.delete(workflowStatuses).where(eq(workflowStatuses.id, id));
}

export async function getWorkflowTransitions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowTransitions);
}

export async function setWorkflowTransition(fromId: number, toId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(workflowTransitions).values({ fromStatusId: fromId, toStatusId: toId });
}

export async function removeWorkflowTransition(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(workflowTransitions).where(eq(workflowTransitions.id, id));
}

export async function getDocumentWorkflowStatus(documentId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentWorkflowStatus).where(eq(documentWorkflowStatus.documentId, documentId)).limit(1);
  return rows[0] || null;
}

export async function setDocumentWorkflowStatus(documentId: number, statusId: number, assignedBy: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await getDocumentWorkflowStatus(documentId);
  if (existing) {
    await db.update(documentWorkflowStatus).set({ statusId, assignedBy, assignedAt: new Date() }).where(eq(documentWorkflowStatus.documentId, documentId));
  } else {
    await db.insert(documentWorkflowStatus).values({ documentId, statusId, assignedBy });
  }
}

// --- Analytics CSV Export ---
export async function getAnalyticsForExport() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT d.title, d.slug, d.category, d.wordCount, d.viewCount, d.upvotes, d.downvotes, d.status, d.visibility, d.createdAt, d.updatedAt
    FROM documents d
    ORDER BY d.viewCount DESC
  `);
  return (rows as any)[0] || [];
}

// --- Archival Policy ---
export async function getArchivalPolicy() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(archivalPolicies).limit(1);
  return rows[0] || null;
}

export async function upsertArchivalPolicy(daysWithoutViews: number, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  const existing = await getArchivalPolicy();
  if (existing) {
    await db.update(archivalPolicies).set({ daysWithoutViews, enabled: enabled ? 1 : 0 }).where(eq(archivalPolicies.id, existing.id));
  } else {
    await db.insert(archivalPolicies).values({ daysWithoutViews, enabled: enabled ? 1 : 0 });
  }
}

export async function getStaleDocumentsForArchival(daysThreshold: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT d.id, d.title, d.slug, d.category, d.viewCount, d.updatedAt
    FROM documents d
    LEFT JOIN archived_documents a ON a.documentId = d.id
    WHERE a.id IS NULL
      AND d.updatedAt < DATE_SUB(NOW(), INTERVAL ${daysThreshold} DAY)
    ORDER BY d.updatedAt ASC
    LIMIT 100
  `);
  return (rows as any)[0] || [];
}

export async function archiveDocument(documentId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(archivedDocuments).values({ documentId, reason });
  await db.update(documents).set({ visibility: "private" }).where(eq(documents.id, documentId));
}

export async function getArchivedDocuments() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT a.id, a.documentId, a.archivedAt, a.reason, d.title, d.slug, d.category
    FROM archived_documents a
    INNER JOIN documents d ON d.id = a.documentId
    ORDER BY a.archivedAt DESC
  `);
  return (rows as any)[0] || [];
}

export async function unarchiveDocument(archiveId: number) {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(archivedDocuments).where(eq(archivedDocuments.id, archiveId)).limit(1);
  if (rows[0]) {
    await db.update(documents).set({ visibility: "public" }).where(eq(documents.id, rows[0].documentId));
    await db.delete(archivedDocuments).where(eq(archivedDocuments.id, archiveId));
  }
}

// --- Content Gap Analysis ---
export async function getContentGapSuggestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentGapSuggestions).orderBy(desc(contentGapSuggestions.createdAt));
}

export async function saveContentGapSuggestions(suggestions: { category: string; suggestedTitle: string; suggestedDescription?: string }[]) {
  const db = await getDb();
  if (!db) return;
  if (suggestions.length === 0) return;
  await db.insert(contentGapSuggestions).values(suggestions);
}

export async function updateContentGapStatus(id: number, status: "accepted" | "dismissed") {
  const db = await getDb();
  if (!db) return;
  await db.update(contentGapSuggestions).set({ status }).where(eq(contentGapSuggestions.id, id));
}

// --- Duplicate Content Detection ---
export async function getDuplicateContentPairs() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT dp.id, dp.documentId1, dp.documentId2, dp.similarityScore, dp.status, dp.detectedAt,
           d1.title as title1, d1.slug as slug1, d2.title as title2, d2.slug as slug2
    FROM duplicate_content_pairs dp
    INNER JOIN documents d1 ON d1.id = dp.documentId1
    INNER JOIN documents d2 ON d2.id = dp.documentId2
    ORDER BY dp.similarityScore DESC
  `);
  return (rows as any)[0] || [];
}

export async function saveDuplicatePair(docId1: number, docId2: number, score: number) {
  const db = await getDb();
  if (!db) return;
  // Check if pair already exists
  const existing = await db.execute(sql`
    SELECT id FROM duplicate_content_pairs
    WHERE (documentId1 = ${docId1} AND documentId2 = ${docId2})
       OR (documentId1 = ${docId2} AND documentId2 = ${docId1})
    LIMIT 1
  `);
  if (((existing as any)[0] || []).length > 0) return;
  await db.insert(duplicateContentPairs).values({ documentId1: docId1, documentId2: docId2, similarityScore: score });
}

export async function updateDuplicateStatus(id: number, status: "resolved" | "ignored") {
  const db = await getDb();
  if (!db) return;
  await db.update(duplicateContentPairs).set({ status }).where(eq(duplicateContentPairs.id, id));
}

// --- Activity Feed ---
export async function addActivityFeedEntry(data: { userOpenId: string; action: string; documentId?: number; documentTitle?: string; documentSlug?: string; category?: string; metadata?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityFeed).values(data);
}

export async function getActivityFeed(userOpenId: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityFeed).where(eq(activityFeed.userOpenId, userOpenId)).orderBy(desc(activityFeed.createdAt)).limit(limit);
}

// --- Quick Edit (inline) ---
export async function quickEditDocument(documentId: number, updates: { title?: string; content?: string }) {
  const db = await getDb();
  if (!db) return;
  const setData: Record<string, any> = {};
  if (updates.title) setData.title = updates.title;
  if (updates.content !== undefined) {
    setData.content = updates.content;
    setData.wordCount = updates.content.split(/\s+/).filter(Boolean).length;
  }
  if (Object.keys(setData).length > 0) {
    await db.update(documents).set(setData).where(eq(documents.id, documentId));
  }
}

// --- Document Embed Code ---
export function generateEmbedCode(slug: string, baseUrl: string) {
  const iframeCode = `<iframe src="${baseUrl}/embed/${slug}" width="100%" height="600" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;"></iframe>`;
  const linkCode = `<a href="${baseUrl}/documents/${slug}" target="_blank" rel="noopener noreferrer">View Document</a>`;
  return { iframe: iframeCode, link: linkCode };
}

// ─── Batch 19 DB Helpers ─────────────────────────────────────────────────

// Document Snapshots
export async function createDocumentSnapshot(data: { documentId: number; name: string; title: string; content: string; createdBy: string }) {
  const db = await getDb(); if (!db) return null;
  await db.insert(documentSnapshots).values(data);
  return { success: true };
}

export async function getDocumentSnapshots(documentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(documentSnapshots).where(eq(documentSnapshots.documentId, documentId)).orderBy(desc(documentSnapshots.createdAt));
}

export async function getSnapshotById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(documentSnapshots).where(eq(documentSnapshots.id, id));
  return rows[0] || null;
}

// Smart Recommendations (collaborative filtering)
export async function recordReadingCorrelation(docIdA: number, docIdB: number) {
  const db = await getDb(); if (!db) return;
  const [a, b] = docIdA < docIdB ? [docIdA, docIdB] : [docIdB, docIdA];
  const existing = await db.select().from(readingCorrelations).where(and(eq(readingCorrelations.documentIdA, a), eq(readingCorrelations.documentIdB, b)));
  if (existing.length > 0) {
    await db.update(readingCorrelations).set({ score: sql`${readingCorrelations.score} + 1` }).where(eq(readingCorrelations.id, existing[0].id));
  } else {
    await db.insert(readingCorrelations).values({ documentIdA: a, documentIdB: b, score: 1 });
  }
}

export async function getSmartRecommendations(documentId: number, limit = 5) {
  const db = await getDb(); if (!db) return [];
  const correlations = await db.select().from(readingCorrelations)
    .where(or(eq(readingCorrelations.documentIdA, documentId), eq(readingCorrelations.documentIdB, documentId)))
    .orderBy(desc(readingCorrelations.score)).limit(limit);
  const relatedIds = correlations.map(c => c.documentIdA === documentId ? c.documentIdB : c.documentIdA);
  if (relatedIds.length === 0) return [];
  const docs = await db.select({ id: documents.id, title: documents.title, slug: documents.slug, category: documents.category })
    .from(documents).where(sql`${documents.id} IN (${sql.join(relatedIds.map(id => sql`${id}`), sql`, `)})`);
  return docs.map(d => ({ ...d, score: correlations.find(c => c.documentIdA === d.id || c.documentIdB === d.id)?.score || 0 }));
}

// Quiz Results (comprehension tracking)
export async function saveQuizResult(data: { userOpenId: string; documentId: number; totalQuestions: number; correctAnswers: number; score: number }) {
  const db = await getDb(); if (!db) return null;
  await db.insert(quizResults).values(data);
  return { success: true };
}

export async function getUserQuizResults(userOpenId: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(quizResults).where(eq(quizResults.userOpenId, userOpenId)).orderBy(desc(quizResults.takenAt));
}

export async function getDocumentQuizScore(userOpenId: string, documentId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(quizResults)
    .where(and(eq(quizResults.userOpenId, userOpenId), eq(quizResults.documentId, documentId)))
    .orderBy(desc(quizResults.takenAt)).limit(1);
  return rows[0] || null;
}

// SEO Metadata
export async function getDocumentSeoMeta(documentId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(documentSeoMeta).where(eq(documentSeoMeta.documentId, documentId));
  return rows[0] || null;
}

export async function upsertDocumentSeoMeta(documentId: number, data: { metaTitle?: string; metaDescription?: string; ogTitle?: string; ogDescription?: string; ogImage?: string }) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(documentSeoMeta).where(eq(documentSeoMeta.documentId, documentId));
  if (existing.length > 0) {
    await db.update(documentSeoMeta).set(data).where(eq(documentSeoMeta.documentId, documentId));
  } else {
    await db.insert(documentSeoMeta).values({ documentId, ...data });
  }
  return { success: true };
}

// System Notification Log
export async function logSystemNotification(data: { recipientOpenId?: string; title: string; content?: string; channel?: string; status?: string }) {
  const db = await getDb(); if (!db) return null;
  await db.insert(systemNotificationLog).values(data);
  return { success: true };
}

export async function getSystemNotificationLog(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(systemNotificationLog).orderBy(desc(systemNotificationLog.createdAt)).limit(limit);
}

export async function retrySystemNotification(id: number) {
  const db = await getDb(); if (!db) return null;
  await db.update(systemNotificationLog).set({ retries: sql`${systemNotificationLog.retries} + 1`, status: 'retrying' }).where(eq(systemNotificationLog.id, id));
  return { success: true };
}

// Admin Dashboard Stats (unified overview)
export async function getAdminDashboardStats() {
  const db = await getDb(); if (!db) return null;
  const [docCount] = await db.select({ total: count() }).from(documents);
  const [userCount] = await db.select({ total: count() }).from(users);
  const [ratingCount] = await db.select({ total: count() }).from(documentRatings);
  const [commentCount] = await db.select({ total: count() }).from(documentComments);
  const [feedbackCount] = await db.select({ total: count() }).from(documentFeedback);
  const recentDocs = await db.select({ id: documents.id, title: documents.title, slug: documents.slug, status: documents.status, updatedAt: documents.updatedAt }).from(documents).orderBy(desc(documents.updatedAt)).limit(5);
  const recentActivity = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(10);
  return {
    totalDocuments: docCount?.total || 0,
    totalUsers: userCount?.total || 0,
    totalRatings: ratingCount?.total || 0,
    totalComments: commentCount?.total || 0,
    totalFeedback: feedbackCount?.total || 0,
    recentDocuments: recentDocs,
    recentActivity,
  };
}

// Bulk ZIP export helper (get docs by category)
export async function getDocumentsForZipExport(slugs: string[]) {
  const db = await getDb(); if (!db) return [];
  if (slugs.length === 0) return [];
  return db.select({ id: documents.id, title: documents.title, slug: documents.slug, content: documents.content, category: documents.category })
    .from(documents).where(sql`${documents.slug} IN (${sql.join(slugs.map(s => sql`${s}`), sql`, `)})`);
}

// Cross-references: find document titles mentioned in content
export async function getAllDocumentTitlesAndSlugs() {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: documents.id, title: documents.title, slug: documents.slug }).from(documents);
}

// User personal stats
export async function getUserPersonalStats(userOpenId: string) {
  const db = await getDb(); if (!db) return null;
  const [readCount] = await db.select({ total: count() }).from(recentlyViewed).where(eq(recentlyViewed.visitorId, userOpenId));
  const [bookmarkCount] = await db.select({ total: count() }).from(readingLists).where(eq(readingLists.visitorId, userOpenId));
  const quizzes = await db.select().from(quizResults).where(eq(quizResults.userOpenId, userOpenId));
  const avgScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) : 0;
  const streak = await db.select().from(readingStreakLeaderboard).where(eq(readingStreakLeaderboard.userOpenId, userOpenId));
  return {
    totalDocsRead: readCount?.total || 0,
    totalBookmarks: bookmarkCount?.total || 0,
    quizzesTaken: quizzes.length,
    averageQuizScore: avgScore,
    currentStreak: streak[0]?.currentStreak || 0,
    longestStreak: streak[0]?.longestStreak || 0,
  };
}

// ── Batch 20 DB Helpers ──

// 1. Admin role delegation
export async function getUserPermissions(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminPermissions).where(eq(adminPermissions.userOpenId, userOpenId));
}

export async function grantPermission(userOpenId: string, permission: string, grantedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminPermissions).values({ userOpenId, permission, grantedBy });
}

export async function revokePermission(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminPermissions).where(eq(adminPermissions.id, id));
}

export async function getAllPermissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminPermissions).orderBy(desc(adminPermissions.createdAt));
}

// 2. Document approval SLA tracking
export async function getSlaConfig() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(approvalSlaConfig).limit(1);
  return rows[0] || null;
}

export async function upsertSlaConfig(maxHoursInReview: number, alertEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(approvalSlaConfig).limit(1);
  if (existing.length > 0) {
    await db.update(approvalSlaConfig).set({ maxHoursInReview, alertEnabled }).where(eq(approvalSlaConfig.id, existing[0].id));
  } else {
    await db.insert(approvalSlaConfig).values({ maxHoursInReview, alertEnabled });
  }
}

export async function getDocsExceedingSla(maxHours: number) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);
  return db.select().from(documents).where(
    and(eq(documents.status, "review"), sql`${documents.updatedAt} < ${cutoff}`)
  );
}

// 3. Webhook event log
export async function logWebhookEvent(data: { webhookId: number; event: string; payload: string; responseStatus?: number; responseBody?: string; success: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookEventLog).values(data);
}

export async function getWebhookEventLogs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookEventLog).orderBy(desc(webhookEventLog.createdAt)).limit(limit).offset(offset);
}

export async function retryWebhookEvent(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(webhookEventLog).where(eq(webhookEventLog.id, id));
  if (!rows[0]) return null;
  await db.update(webhookEventLog).set({ retriesLeft: sql`${webhookEventLog.retriesLeft} - 1` }).where(eq(webhookEventLog.id, id));
  return rows[0];
}

// 4. Document access requests
export async function createAccessRequest(documentId: number, requesterOpenId: string, requesterName: string | null, reason: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.insert(documentAccessRequests).values({ documentId, requesterOpenId, requesterName, reason });
}

export async function getAccessRequests(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(documentAccessRequests).where(eq(documentAccessRequests.status, status)).orderBy(desc(documentAccessRequests.createdAt));
  }
  return db.select().from(documentAccessRequests).orderBy(desc(documentAccessRequests.createdAt));
}

export async function reviewAccessRequest(id: number, status: string, reviewedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(documentAccessRequests).set({ status, reviewedBy, reviewedAt: new Date() }).where(eq(documentAccessRequests.id, id));
}

export async function getUserAccessRequests(requesterOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentAccessRequests).where(eq(documentAccessRequests.requesterOpenId, requesterOpenId)).orderBy(desc(documentAccessRequests.createdAt));
}

// 5. Version comparison (uses existing documentVersions)
export async function getDocumentVersionById(versionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentVersions).where(eq(documentVersions.id, versionId));
  return rows[0] || null;
}

// 6. Batch AI summarization (uses existing aiSummaries)
export async function getDocumentsWithoutSummary(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const summarized = db.select({ documentSlug: aiSummaries.documentSlug }).from(aiSummaries);
  return db.select({ slug: documents.slug, title: documents.title, content: documents.content })
    .from(documents)
    .where(sql`${documents.slug} NOT IN (${summarized})`)
    .limit(limit);
}

// 7. User onboarding checklist
export async function getOnboardingProgress(userOpenId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingProgress).where(eq(onboardingProgress.userOpenId, userOpenId));
}

export async function completeOnboardingTask(userOpenId: string, taskKey: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(onboardingProgress).where(and(eq(onboardingProgress.userOpenId, userOpenId), eq(onboardingProgress.taskKey, taskKey)));
  if (existing.length > 0) {
    await db.update(onboardingProgress).set({ completed: true, completedAt: new Date() }).where(eq(onboardingProgress.id, existing[0].id));
  } else {
    await db.insert(onboardingProgress).values({ userOpenId, taskKey, completed: true, completedAt: new Date() });
  }
}

export async function initOnboardingTasks(userOpenId: string) {
  const db = await getDb();
  if (!db) return;
  const tasks = ['read_5_docs', 'complete_quiz', 'bookmark_doc', 'create_reading_list', 'set_preferences', 'search_document'];
  const existing = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userOpenId, userOpenId));
  const existingKeys = new Set(existing.map(e => e.taskKey));
  const toInsert = tasks.filter(t => !existingKeys.has(t)).map(taskKey => ({ userOpenId, taskKey }));
  if (toInsert.length > 0) {
    await db.insert(onboardingProgress).values(toInsert);
  }
}

// 8. Admin system health (no DB table needed - returns runtime info)

// 9. Document citation generator
export async function getCachedCitation(documentId: number, style: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(documentCitations).where(and(eq(documentCitations.documentId, documentId), eq(documentCitations.style, style)));
  return rows[0] || null;
}

export async function saveCitation(documentId: number, style: string, citation: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await getCachedCitation(documentId, style);
  if (existing) {
    await db.update(documentCitations).set({ citation }).where(eq(documentCitations.id, existing.id));
  } else {
    await db.insert(documentCitations).values({ documentId, style, citation });
  }
}


// ===== ADVANCED ANALYTICS =====

// Reading activity over time (unique readers per day)
export async function getReadingActivityOverTime(days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(${recentlyViewed.viewedAt})`,
    readers: sql<number>`COUNT(DISTINCT ${recentlyViewed.visitorId})`,
    reads: count(),
  })
    .from(recentlyViewed)
    .where(sql`${recentlyViewed.viewedAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${recentlyViewed.viewedAt})`)
    .orderBy(sql`DATE(${recentlyViewed.viewedAt})`);
}

// Engagement over time (ratings per day)
export async function getEngagementOverTime(days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(${documentRatings.createdAt})`,
    upvotes: sql<number>`SUM(CASE WHEN ${documentRatings.rating} = 'up' THEN 1 ELSE 0 END)`,
    downvotes: sql<number>`SUM(CASE WHEN ${documentRatings.rating} = 'down' THEN 1 ELSE 0 END)`,
    total: count(),
  })
    .from(documentRatings)
    .where(sql`${documentRatings.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${documentRatings.createdAt})`)
    .orderBy(sql`DATE(${documentRatings.createdAt})`);
}

// Activity breakdown by action type over time
export async function getActivityBreakdown(days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(${activityLog.createdAt})`,
    action: activityLog.action,
    count: count(),
  })
    .from(activityLog)
    .where(sql`${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${activityLog.createdAt})`, activityLog.action)
    .orderBy(sql`DATE(${activityLog.createdAt})`);
}

// Top documents by engagement (views + ratings combined)
export async function getTopDocsByEngagement(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    viewCount: documents.viewCount,
    upvotes: documents.upvotes,
    downvotes: documents.downvotes,
    wordCount: documents.wordCount,
    engagementScore: sql<number>`COALESCE(${documents.viewCount}, 0) + COALESCE(${documents.upvotes}, 0) * 5 - COALESCE(${documents.downvotes}, 0) * 3`,
  })
    .from(documents)
    .orderBy(sql`COALESCE(${documents.viewCount}, 0) + COALESCE(${documents.upvotes}, 0) * 5 - COALESCE(${documents.downvotes}, 0) * 3 DESC`)
    .limit(limit);
}

// Content growth over time (new documents created per day)
export async function getContentGrowthOverTime(days = 90) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(${documents.createdAt})`,
    newDocs: count(),
    cumulativeTotal: sql<number>`(SELECT COUNT(*) FROM documents d2 WHERE DATE(d2.createdAt) <= DATE(${documents.createdAt}))`,
  })
    .from(documents)
    .where(sql`${documents.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DATE(${documents.createdAt})`)
    .orderBy(sql`DATE(${documents.createdAt})`);
}

// Analytics summary stats
export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return null;
  const [docStats] = await db.select({
    totalDocs: count(),
    totalViews: sql<number>`COALESCE(SUM(${documents.viewCount}), 0)`,
    totalUpvotes: sql<number>`COALESCE(SUM(${documents.upvotes}), 0)`,
    totalDownvotes: sql<number>`COALESCE(SUM(${documents.downvotes}), 0)`,
    avgWordCount: sql<number>`ROUND(AVG(COALESCE(${documents.wordCount}, 0)))`,
  }).from(documents);
  
  const [downloadStats] = await db.select({
    totalDownloads: count(),
  }).from(downloadHistory);
  
  const [readerStats] = await db.select({
    uniqueReaders: sql<number>`COUNT(DISTINCT ${recentlyViewed.visitorId})`,
  }).from(recentlyViewed);
  
  const [todayViews] = await db.select({
    views: count(),
  }).from(activityLog)
    .where(sql`${activityLog.action} = 'view' AND DATE(${activityLog.createdAt}) = CURDATE()`);
  
  return {
    ...docStats,
    totalDownloads: downloadStats?.totalDownloads || 0,
    uniqueReaders: readerStats?.uniqueReaders || 0,
    todayViews: todayViews?.views || 0,
  };
}

// Hourly activity heatmap data (hour of day vs day of week)
export async function getHourlyActivityHeatmap(days = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    dayOfWeek: sql<number>`DAYOFWEEK(${activityLog.createdAt})`,
    hourOfDay: sql<number>`HOUR(${activityLog.createdAt})`,
    count: count(),
  })
    .from(activityLog)
    .where(sql`${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`DAYOFWEEK(${activityLog.createdAt})`, sql`HOUR(${activityLog.createdAt})`)
    .orderBy(sql`DAYOFWEEK(${activityLog.createdAt})`, sql`HOUR(${activityLog.createdAt})`);
}


// ===== BATCH 21: FOLLOW-UP FEATURES =====

// Feature 1: Comparative period analytics
export async function getComparativePeriodAnalytics(days = 30) {
  const db = await getDb();
  if (!db) return null;
  // Current period
  const [currentViews] = await db.select({ total: count() }).from(activityLog)
    .where(sql`${activityLog.action} = 'view' AND ${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [currentDownloads] = await db.select({ total: count() }).from(downloadHistory)
    .where(sql`${downloadHistory.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [currentRatings] = await db.select({ total: count() }).from(documentRatings)
    .where(sql`${documentRatings.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [currentReaders] = await db.select({ total: sql<number>`COUNT(DISTINCT ${recentlyViewed.visitorId})` }).from(recentlyViewed)
    .where(sql`${recentlyViewed.viewedAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  // Previous period
  const [prevViews] = await db.select({ total: count() }).from(activityLog)
    .where(sql`${activityLog.action} = 'view' AND ${activityLog.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days * 2} DAY) AND ${activityLog.createdAt} < DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [prevDownloads] = await db.select({ total: count() }).from(downloadHistory)
    .where(sql`${downloadHistory.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days * 2} DAY) AND ${downloadHistory.createdAt} < DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [prevRatings] = await db.select({ total: count() }).from(documentRatings)
    .where(sql`${documentRatings.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days * 2} DAY) AND ${documentRatings.createdAt} < DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  const [prevReaders] = await db.select({ total: sql<number>`COUNT(DISTINCT ${recentlyViewed.visitorId})` }).from(recentlyViewed)
    .where(sql`${recentlyViewed.viewedAt} >= DATE_SUB(NOW(), INTERVAL ${days * 2} DAY) AND ${recentlyViewed.viewedAt} < DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  return {
    current: { views: currentViews?.total || 0, downloads: currentDownloads?.total || 0, ratings: currentRatings?.total || 0, readers: currentReaders?.total || 0 },
    previous: { views: prevViews?.total || 0, downloads: prevDownloads?.total || 0, ratings: prevRatings?.total || 0, readers: prevReaders?.total || 0 },
  };
}

// Feature 4: Document popularity trending (weighted recency)
export async function getTrendingDocuments(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  // Weighted score: views in last 7 days * 3 + views in 7-30 days * 1 + upvotes * 5
  return db.execute(sql`
    SELECT d.slug, d.title, d.category, d.viewCount, d.upvotes, d.downvotes,
      COALESCE((SELECT COUNT(*) FROM activity_log a WHERE a.action = 'view' AND a.documentSlug = d.slug AND a.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) * 3 +
      COALESCE((SELECT COUNT(*) FROM activity_log a WHERE a.action = 'view' AND a.documentSlug = d.slug AND a.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND a.createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) +
      COALESCE(d.upvotes, 0) * 5 AS trendingScore
    FROM documents d
    ORDER BY trendingScore DESC
    LIMIT ${limit}
  `);
}

// Feature 5: Admin bulk document quality audit
export async function runDocumentQualityAudit() {
  const db = await getDb();
  if (!db) return [];
  const allDocs = await db.select({
    slug: documents.slug,
    title: documents.title,
    content: documents.content,
    category: documents.category,
    wordCount: documents.wordCount,
  }).from(documents);

  const results: { slug: string; issues: string[]; score: number }[] = [];
  for (const doc of allDocs) {
    const issues: string[] = [];
    let score = 100;
    if (!doc.content || doc.content.length < 100) { issues.push('Content too short (< 100 chars)'); score -= 30; }
    if (!doc.title || doc.title.length < 5) { issues.push('Title too short'); score -= 15; }
    if ((doc.wordCount || 0) < 50) { issues.push('Word count below 50'); score -= 20; }
    if (!doc.category) { issues.push('Missing category'); score -= 10; }
    // Check for tags
    const tags = await db.select({ id: documentTags.id }).from(documentTags).where(eq(documentTags.documentSlug, doc.slug)).limit(1);
    if (tags.length === 0) { issues.push('No tags assigned'); score -= 10; }
    if (issues.length > 0) {
      results.push({ slug: doc.slug, issues, score: Math.max(0, score) });
    }
  }
  // Save audit results
  for (const r of results) {
    await db.insert(documentQualityAudits).values({
      documentSlug: r.slug,
      issues: JSON.stringify(r.issues),
      score: r.score,
    });
  }
  return results;
}

export async function getLatestQualityAudits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentQualityAudits).orderBy(desc(documentQualityAudits.auditedAt)).limit(500);
}

// Feature 6: User reading session analytics
export async function recordReadingSession(data: { visitorId: string; documentSlug: string; durationSeconds: number; scrollDepthPercent: number; completed: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(readingSessions).values(data);
}

export async function getReadingSessionAnalytics(days = 30) {
  const db = await getDb();
  if (!db) return null;
  const [stats] = await db.select({
    totalSessions: count(),
    avgDuration: sql<number>`ROUND(AVG(${readingSessions.durationSeconds}))`,
    avgScrollDepth: sql<number>`ROUND(AVG(${readingSessions.scrollDepthPercent}))`,
    completionRate: sql<number>`ROUND(AVG(${readingSessions.completed}) * 100)`,
    uniqueReaders: sql<number>`COUNT(DISTINCT ${readingSessions.visitorId})`,
  }).from(readingSessions)
    .where(sql`${readingSessions.startedAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);
  
  const sessionsOverTimeRaw = await db.execute(sql`
    SELECT DATE(startedAt) as date, COUNT(*) as sessions, ROUND(AVG(durationSeconds)) as avgDuration
    FROM reading_sessions
    WHERE startedAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY DATE(startedAt)
    ORDER BY date
  `);
  const sessionsOverTime = (sessionsOverTimeRaw as any)?.[0] || [];
  
  return { summary: stats, overTime: sessionsOverTime };
}

// Feature 7: Document content freshness indicator
export async function getDocumentFreshnessReport() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    slug: documents.slug,
    title: documents.title,
    category: documents.category,
    updatedAt: documents.updatedAt,
    createdAt: documents.createdAt,
    daysSinceUpdate: sql<number>`DATEDIFF(NOW(), COALESCE(${documents.updatedAt}, ${documents.createdAt}))`,
  }).from(documents).orderBy(sql`DATEDIFF(NOW(), COALESCE(${documents.updatedAt}, ${documents.createdAt})) DESC`);
}

// Feature 8: Email digest configuration
export async function getEmailDigestConfig(ownerId: string) {
  const db = await getDb();
  if (!db) return null;
  const [config] = await db.select().from(emailDigestConfig).where(eq(emailDigestConfig.ownerId, ownerId));
  return config || null;
}

export async function upsertEmailDigestConfig(data: { ownerId: string; frequency: 'daily' | 'weekly' | 'monthly' | 'disabled'; includeMetrics: number; includeTopDocs: number; includeNewDocs: number }) {
  const db = await getDb();
  if (!db) return;
  const existing = await getEmailDigestConfig(data.ownerId);
  if (existing) {
    await db.update(emailDigestConfig).set({ ...data, updatedAt: new Date() }).where(eq(emailDigestConfig.id, existing.id));
  } else {
    await db.insert(emailDigestConfig).values(data as any);
  }
}

// Feature 9: Document media attachments
export async function getDocumentMedia(slug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentMedia).where(eq(documentMedia.documentSlug, slug)).orderBy(asc(documentMedia.sortOrder));
}

export async function addDocumentMedia(data: { documentSlug: string; fileName: string; fileUrl: string; fileType: string; fileSize: number; caption?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(documentMedia).values(data);
}

export async function removeDocumentMedia(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documentMedia).where(eq(documentMedia.id, id));
}

// Feature 10: Global site statistics (public)
export async function getPublicSiteStats() {
  const db = await getDb();
  if (!db) return null;
  const [docStats] = await db.select({
    totalDocs: count(),
    totalViews: sql<number>`COALESCE(SUM(${documents.viewCount}), 0)`,
    totalCategories: sql<number>`COUNT(DISTINCT ${documents.category})`,
    totalWords: sql<number>`COALESCE(SUM(${documents.wordCount}), 0)`,
  }).from(documents);
  
  const [readerStats] = await db.select({
    totalReaders: sql<number>`COUNT(DISTINCT ${recentlyViewed.visitorId})`,
  }).from(recentlyViewed);
  
  const growthData = await db.execute(sql`
    SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as count
    FROM documents
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
    ORDER BY month
  `);
  
  return {
    ...docStats,
    totalReaders: readerStats?.totalReaders || 0,
    growthByMonth: (growthData as any)?.[0] || [],
  };
}
