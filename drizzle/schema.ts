import { int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Documents table - stores all ARG-Builder operational documents
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  content: mediumtext("content"),
  wordCount: int("wordCount").default(0),
  viewCount: int("viewCount").default(0),
  upvotes: int("upvotes").default(0),
  downvotes: int("downvotes").default(0),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// Document ratings - tracks individual user votes
export const documentRatings = mysqlTable("document_ratings", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  rating: mysqlEnum("rating", ["up", "down"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentRating = typeof documentRatings.$inferSelect;

// Reading lists - user-created collections of documents
export const readingLists = mysqlTable("reading_lists", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReadingList = typeof readingLists.$inferSelect;

// Reading list items - documents in a reading list
export const readingListItems = mysqlTable("reading_list_items", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("listId").notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type ReadingListItem = typeof readingListItems.$inferSelect;

// Search analytics - tracks search queries and their results
export const searchAnalytics = mysqlTable("search_analytics", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 500 }).notNull(),
  resultCount: int("resultCount").default(0),
  visitorId: varchar("visitorId", { length: 100 }),
  clickedSlug: varchar("clickedSlug", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchAnalytic = typeof searchAnalytics.$inferSelect;

// Document tags - multi-tag system for documents
export const documentTags = mysqlTable("document_tags", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  tag: varchar("tag", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentTag = typeof documentTags.$inferSelect;

// Document comments/notes - visitor-scoped annotations
export const documentComments = mysqlTable("document_comments", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentComment = typeof documentComments.$inferSelect;

// Document versions - track edit history
export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: mediumtext("content"),
  editedBy: varchar("editedBy", { length: 100 }),
  changeNote: varchar("changeNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
