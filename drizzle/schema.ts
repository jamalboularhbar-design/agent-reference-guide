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
  // Workflow states: draft, review, published
  status: mysqlEnum("status", ["draft", "review", "published"]).default("published").notNull(),
  // Pinning: pinned documents appear at top
  pinned: int("pinned").default(0).notNull(),
  // Review/expiry reminder date
  reviewBy: timestamp("reviewBy"),
  // Access control: public (everyone), private (admin only)
  visibility: mysqlEnum("visibility", ["public", "private"]).default("public").notNull(),
  // Language/locale for i18n
  locale: varchar("locale", { length: 10 }).default("en").notNull(),
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

// Custom categories - admin-defined categories beyond the seeded ones
export const customCategories = mysqlTable("custom_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomCategory = typeof customCategories.$inferSelect;

// Download history - tracks document downloads
export const downloadHistory = mysqlTable("download_history", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }),
  format: varchar("format", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DownloadHistoryEntry = typeof downloadHistory.$inferSelect;

// Site announcements - admin-configurable banners
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "success"]).default("info").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;

// Activity log - tracks admin-visible user actions
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  action: varchar("action", { length: 50 }).notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }),
  visitorId: varchar("visitorId", { length: 100 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;

// Glossary terms - definitions for key terms used across documents
export const glossaryTerms = mysqlTable("glossary_terms", {
  id: int("id").autoincrement().primaryKey(),
  term: varchar("term", { length: 200 }).notNull().unique(),
  definition: text("definition").notNull(),
  category: varchar("category", { length: 100 }),
  relatedTerms: text("relatedTerms"), // JSON array of related term strings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlossaryTerm = typeof glossaryTerms.$inferSelect;

// Document dependencies/prerequisites
export const documentDependencies = mysqlTable("document_dependencies", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  prerequisiteSlug: varchar("prerequisiteSlug", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentDependency = typeof documentDependencies.$inferSelect;

// Reading goals - weekly reading targets and progress
export const readingGoals = mysqlTable("reading_goals", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  weeklyTarget: int("weeklyTarget").default(5).notNull(), // docs per week
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReadingGoal = typeof readingGoals.$inferSelect;

// Reading progress entries - track individual document reads
export const readingProgress = mysqlTable("reading_progress", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  weekNumber: int("weekNumber").notNull(), // ISO week number
  yearNumber: int("yearNumber").notNull(),
});

export type ReadingProgressEntry = typeof readingProgress.$inferSelect;

// Document templates gallery - reusable document templates
export const documentTemplates = mysqlTable("document_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  content: mediumtext("content").notNull(),
  icon: varchar("icon", { length: 50 }),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;

// Document audit trail - detailed changelog per document
export const documentAuditTrail = mysqlTable("document_audit_trail", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // created, updated, status_changed, pinned, unpinned, deleted
  field: varchar("field", { length: 100 }), // which field was changed
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  changedBy: varchar("changedBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentAuditEntry = typeof documentAuditTrail.$inferSelect;

// Bookmark notes - personal notes attached to bookmarks
export const bookmarkNotes = mysqlTable("bookmark_notes", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookmarkNote = typeof bookmarkNotes.$inferSelect;

// Share links - time-limited share URLs for documents
export const shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdBy: varchar("createdBy", { length: 100 }),
  accessCount: int("accessCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShareLink = typeof shareLinks.$inferSelect;

// Scheduled publish - future publish dates for draft documents
export const scheduledPublish = mysqlTable("scheduled_publish", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull().unique(),
  publishAt: timestamp("publishAt").notNull(),
  createdBy: varchar("createdBy", { length: 100 }),
  status: mysqlEnum("status", ["pending", "published", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduledPublishEntry = typeof scheduledPublish.$inferSelect;

// Inline comments - contextual comments on highlighted text
export const inlineComments = mysqlTable("inline_comments", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  highlightText: text("highlightText").notNull(), // the highlighted text
  comment: text("comment").notNull(),
  parentId: int("parentId"), // for threaded replies
  resolved: int("resolved").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InlineComment = typeof inlineComments.$inferSelect;

// Branding settings - admin-configurable site branding
export const brandingSettings = mysqlTable("branding_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandingSetting = typeof brandingSettings.$inferSelect;

// Webhooks - configurable HTTP POST endpoints for document events
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  url: text("url").notNull(),
  events: text("events").notNull(), // JSON array of event types
  secret: varchar("secret", { length: 100 }),
  active: int("active").default(1).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  failCount: int("failCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;

// Recently viewed - tracks last viewed documents per visitor
export const recentlyViewed = mysqlTable("recently_viewed", {
  id: int("id").autoincrement().primaryKey(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type RecentlyViewedEntry = typeof recentlyViewed.$inferSelect;

// Document feedback - simple thumbs up/down with optional text
export const documentFeedback = mysqlTable("document_feedback", {
  id: int("id").autoincrement().primaryKey(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  visitorId: varchar("visitorId", { length: 100 }).notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "negative"]).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentFeedbackEntry = typeof documentFeedback.$inferSelect;

// Document collections/playlists - curated reading paths
export const documentCollections = mysqlTable("document_collections", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  coverColor: varchar("coverColor", { length: 20 }).default("#c9a96e"),
  isPublished: int("isPublished").default(0).notNull(),
  createdBy: varchar("createdBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentCollection = typeof documentCollections.$inferSelect;

// Collection items - ordered documents in a collection
export const collectionItems = mysqlTable("collection_items", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  documentSlug: varchar("documentSlug", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CollectionItem = typeof collectionItems.$inferSelect;

// Category ordering - admin-defined display order for categories
export const categoryOrdering = mysqlTable("category_ordering", {
  id: int("id").autoincrement().primaryKey(),
  categoryName: varchar("categoryName", { length: 100 }).notNull().unique(),
  sortOrder: int("sortOrder").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CategoryOrder = typeof categoryOrdering.$inferSelect;
