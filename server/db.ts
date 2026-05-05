import { eq, like, or, sql, desc, asc, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, documentRatings, readingLists, readingListItems, searchAnalytics, documentTags, documentComments, documentVersions, customCategories, downloadHistory, announcements, activityLog } from "../drizzle/schema";
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

import { glossaryTerms, documentDependencies, readingGoals, readingProgress, documentTemplates } from "../drizzle/schema";

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
