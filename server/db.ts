import { eq, like, or, sql, desc, asc, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents, documentRatings, readingLists, readingListItems } from "../drizzle/schema";
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
}) {
  const db = await getDb();
  if (!db) return { documents: [], total: 0 };

  const { category, search, sort = 'alpha', limit = 50, offset = 0 } = opts;

  const conditions = [];
  if (category) {
    conditions.push(eq(documents.category, category));
  }
  if (search) {
    const pattern = `%${search.toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${documents.title}) LIKE ${pattern} OR LOWER(${documents.category}) LIKE ${pattern} OR LOWER(${documents.content}) LIKE ${pattern})`
    );
  }

  const whereClause = conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : sql`${conditions[0]} AND ${conditions[1]}`
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
    createdAt: documents.createdAt,
    ...(search ? { snippet: sql<string>`SUBSTRING(${documents.content}, GREATEST(1, LOCATE(LOWER(${search}), LOWER(${documents.content})) - 60), 200)` } : {}),
  };

  const rows = whereClause
    ? await db
        .select(selectFields)
        .from(documents)
        .where(whereClause)
        .orderBy(sort === 'reading_time' ? asc(documents.wordCount) : sort === 'newest' ? desc(documents.createdAt) : asc(documents.title))
        .limit(limit)
        .offset(offset)
    : await db
        .select(selectFields)
        .from(documents)
        .orderBy(sort === 'reading_time' ? asc(documents.wordCount) : sort === 'newest' ? desc(documents.createdAt) : asc(documents.title))
        .limit(limit)
        .offset(offset);

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
    .where(sql`${documents.category} = ${category} AND ${documents.slug} != ${slug}`)
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
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(documents).values(data);
  return getDocumentBySlug(data.slug);
}

export async function updateDocument(slug: string, data: {
  title?: string;
  category?: string;
  content?: string;
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

  if (Object.keys(updateSet).length === 0) return getDocumentBySlug(slug);

  await db.update(documents).set(updateSet).where(eq(documents.slug, slug));
  return getDocumentBySlug(slug);
}

export async function deleteDocument(slug: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(documents).where(eq(documents.slug, slug));
  return { success: true };
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

// ─── Document Ratings ──────────────────────────────────────────────────────

export async function rateDocument(slug: string, visitorId: string, rating: 'up' | 'down') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Check if user already rated this document
  const existing = await db.select().from(documentRatings)
    .where(and(eq(documentRatings.documentSlug, slug), eq(documentRatings.visitorId, visitorId)))
    .limit(1);

  if (existing.length > 0) {
    const oldRating = existing[0].rating;
    if (oldRating === rating) {
      // Remove rating (toggle off)
      await db.delete(documentRatings).where(eq(documentRatings.id, existing[0].id));
      // Decrement count
      if (rating === 'up') {
        await db.update(documents).set({ upvotes: sql`GREATEST(0, ${documents.upvotes} - 1)` }).where(eq(documents.slug, slug));
      } else {
        await db.update(documents).set({ downvotes: sql`GREATEST(0, ${documents.downvotes} - 1)` }).where(eq(documents.slug, slug));
      }
      return { action: 'removed', rating: null };
    } else {
      // Change rating
      await db.update(documentRatings).set({ rating }).where(eq(documentRatings.id, existing[0].id));
      if (rating === 'up') {
        await db.update(documents).set({ upvotes: sql`${documents.upvotes} + 1`, downvotes: sql`GREATEST(0, ${documents.downvotes} - 1)` }).where(eq(documents.slug, slug));
      } else {
        await db.update(documents).set({ downvotes: sql`${documents.downvotes} + 1`, upvotes: sql`GREATEST(0, ${documents.upvotes} - 1)` }).where(eq(documents.slug, slug));
      }
      return { action: 'changed', rating };
    }
  } else {
    // New rating
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
    .orderBy(sql`(${documents.viewCount} + ${documents.upvotes} * 3 - ${documents.downvotes}) DESC`)
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

  // Get item counts for each list
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

  // Check if already in list
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
