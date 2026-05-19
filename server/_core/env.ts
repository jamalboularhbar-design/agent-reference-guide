export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Admin credentials (set in Railway environment variables)
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@argbuilder.io",
  adminPassword: process.env.ADMIN_PASSWORD ?? "changeme",
  // Owner openId — fixed to "admin" for standalone deployment
  ownerOpenId: "admin",
  // Legacy Manus storage — kept for backward compat (optional)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
