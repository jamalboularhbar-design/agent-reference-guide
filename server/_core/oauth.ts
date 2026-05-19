import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk, checkAdminPassword } from "./sdk";
import { ENV } from "./env";

export function registerOAuthRoutes(app: Express) {
  // Email + password login — replaces Manus OAuth
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    // Validate against admin credentials from env vars
    const emailMatch = email.toLowerCase().trim() === ENV.adminEmail.toLowerCase().trim();
    const passwordMatch = await checkAdminPassword(password);

    if (!emailMatch || !passwordMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Upsert admin user in DB
    const openId = "admin";
    await db.upsertUser({
      openId,
      name: "Admin",
      email: ENV.adminEmail,
      loginMethod: "email",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name: "Admin",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true });
  });
}
