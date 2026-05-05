import { eq, like, or, sql, desc, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, documents } from "../drizzle/schema";
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
