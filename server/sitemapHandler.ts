import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { documents } from "../drizzle/schema";

const BASE_URL = "https://www.argbuilder.io";

// Static routes with their change frequency and priority
const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/product", changefreq: "weekly", priority: "0.9" },
  { path: "/roi", changefreq: "monthly", priority: "0.7" },
  { path: "/billing", changefreq: "monthly", priority: "0.3" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function sitemapHandler(req: Request, res: Response) {
  try {
    const db = await getDb();

    let documentUrls: string[] = [];

    if (db) {
      // Fetch all published documents
      const publishedDocs = await db
        .select({
          slug: documents.slug,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(eq(documents.status, "published"));

      documentUrls = publishedDocs.map(
        (doc) =>
          `  <url>
    <loc>${escapeXml(`${BASE_URL}/docs/${doc.slug}`)}</loc>
    <lastmod>${formatDate(doc.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
      );
    }

    const staticUrls = STATIC_ROUTES.map(
      (route) =>
        `  <url>
    <loc>${escapeXml(`${BASE_URL}${route.path}`)}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join("\n")}
${documentUrls.join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.status(200).send(xml);
  } catch (error) {
    console.error("[Sitemap] Error generating sitemap:", error);
    // Return a minimal sitemap even on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/product</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
    res.set("Content-Type", "application/xml");
    res.status(200).send(fallbackXml);
  }
}
