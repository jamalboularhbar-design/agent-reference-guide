import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk, checkAdminPassword } from "./sdk";
import { ENV } from "./env";
import { loginLimiter, passwordResetLimiter } from "../rateLimiter";

// Session durations
const SESSION_REMEMBER_ME = ONE_YEAR_MS; // 1 year
const SESSION_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours

export function registerOAuthRoutes(app: Express) {
  // Email + password login — replaces Manus OAuth
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    // Rate limit: 5 attempts per IP per 15 minutes
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const { allowed, resetMs } = loginLimiter.check(ip);
    if (!allowed) {
      res.status(429).json({
        error: `Too many login attempts. Please try again in ${Math.ceil(resetMs / 60000)} minutes.`,
      });
      return;
    }

    const { email, password, rememberMe } = req.body ?? {};

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

    // Session duration based on "Remember me" checkbox
    const sessionDuration = rememberMe ? SESSION_REMEMBER_ME : SESSION_DEFAULT;

    const sessionToken = await sdk.createSessionToken(openId, {
      name: "Admin",
      expiresInMs: sessionDuration,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: sessionDuration });
    res.json({ success: true });
  });

  // Password reset request (sends notification to owner)
  app.post("/api/auth/reset-password-request", async (req: Request, res: Response) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const { allowed } = passwordResetLimiter.check(ip);
    if (!allowed) {
      // Always return success to prevent email enumeration
      res.json({ success: true, message: "If that email exists, a reset link has been sent." });
      return;
    }

    const { email } = req.body ?? {};
    if (typeof email !== "string") {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Only process if it matches the admin email (prevents enumeration)
    if (email.toLowerCase().trim() === ENV.adminEmail.toLowerCase().trim()) {
      // Generate a time-limited reset token (valid for 1 hour)
      const resetToken = await sdk.createSessionToken("admin-reset", {
        name: "password-reset",
        expiresInMs: 60 * 60 * 1000, // 1 hour
      });

      // Notify owner with the reset token
      const { notifyOwner } = await import("./notification");
      await notifyOwner({
        title: "Password Reset Requested",
        content: `A password reset was requested for ${email}.\n\nReset token: ${resetToken}\n\nThis token expires in 1 hour. Use it at /reset-password?token=<token> to set a new password.\n\nIf you didn't request this, you can safely ignore this notification.`,
      }).catch(() => {});
    }

    // Always return success to prevent email enumeration
    res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  });

  // Password change (authenticated admin only)
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    // Verify current password
    const passwordMatch = await checkAdminPassword(currentPassword);
    if (!passwordMatch) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Note: In a full implementation, this would update the ADMIN_PASSWORD env var.
    // For now, we notify the owner that a password change was attempted.
    const { notifyOwner } = await import("./notification");
    await notifyOwner({
      title: "Password Change Requested",
      content: `The admin password change was requested. To update the password, go to Settings → Secrets in the Manus dashboard and update the ADMIN_PASSWORD value to the new password.`,
    }).catch(() => {});

    res.json({ success: true, message: "Password change request sent. Update ADMIN_PASSWORD in Settings → Secrets." });
  });
}
