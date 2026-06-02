import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { createClient } from "@libsql/client";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 4173);
const DB_URL = process.env.TURSO_DATABASE_URL || "";
const DB_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const APP_ORIGIN = process.env.APP_ORIGIN || `http://localhost:${PORT}`;
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@apexledger.local";
const SESSION_COOKIE = "apex_session";
const STARTING_BALANCE = 250000;
const DEFAULT_CARD_BRAND = "Visa";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const VERIFICATION_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TOKEN_DURATION_MS = 1000 * 60 * 30;

if (!DB_URL) {
  console.error("Missing TURSO_DATABASE_URL. Copy .env.example to .env and fill in Turso credentials.");
  process.exit(1);
}

const db = createClient({
  url: DB_URL,
  authToken: DB_AUTH_TOKEN || undefined,
});

const mailer =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

const apiApp = express();
apiApp.use(express.json({ limit: "1mb" }));

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ];

  if (isProd) cookie.push("Secure");
  res.setHeader("Set-Cookie", cookie.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash: derivedKey };
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signToken(token) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

function serializeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    balance: row.balance,
    emailVerified: Boolean(row.email_verified_at),
  };
}

async function ensureColumn(tableName, columnName, definition) {
  const result = await db.execute(`PRAGMA table_info(${tableName})`);
  const hasColumn = result.rows.some((row) => row.name === columnName);
  if (!hasColumn) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT ${STARTING_BALANCE},
      created_at TEXT NOT NULL
    )
  `);
  await ensureColumn("users", "email_verified_at", "TEXT");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      signature TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      race TEXT NOT NULL,
      tier TEXT NOT NULL,
      amount INTEGER NOT NULL,
      predictions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      cardholder TEXT NOT NULL,
      brand TEXT NOT NULL,
      last4 TEXT NOT NULL,
      exp_month INTEGER NOT NULL,
      exp_year INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      points_delta INTEGER NOT NULL,
      usd_amount REAL,
      payment_method_id TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function loadUserEntries(userId) {
  const result = await db.execute({
    sql: `
      SELECT race, tier, amount, predictions_json, created_at
      FROM entries
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });

  return result.rows.map((row) => ({
    race: row.race,
    tier: row.tier,
    amount: row.amount,
    predictions: JSON.parse(row.predictions_json),
    createdAt: row.created_at,
  }));
}

async function loadPaymentMethods(userId) {
  const result = await db.execute({
    sql: `
      SELECT id, cardholder, brand, last4, exp_month, exp_year, is_default, created_at
      FROM payment_methods
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at ASC
    `,
    args: [userId],
  });

  return result.rows.map((row) => ({
    id: row.id,
    cardholder: row.cardholder,
    brand: row.brand,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  }));
}

async function loadWalletTransactions(userId) {
  const result = await db.execute({
    sql: `
      SELECT t.kind, t.points_delta, t.usd_amount, t.description, t.created_at, p.brand, p.last4
      FROM wallet_transactions t
      LEFT JOIN payment_methods p ON p.id = t.payment_method_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 24
    `,
    args: [userId],
  });

  return result.rows.map((row) => ({
    kind: row.kind,
    pointsDelta: row.points_delta,
    usdAmount: row.usd_amount,
    description: row.description,
    createdAt: row.created_at,
    paymentMethod: row.brand && row.last4 ? `${row.brand} •••• ${row.last4}` : "",
  }));
}

async function buildUserPayload(userRowOrId) {
  let userRow = userRowOrId;
  if (typeof userRowOrId === "string") {
    const result = await db.execute({
      sql: `
        SELECT id, name, email, balance, email_verified_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      args: [userRowOrId],
    });
    userRow = result.rows[0];
  }

  if (!userRow) return null;

  const user = serializeUser(userRow);
  const [entries, paymentMethods, walletTransactions] = await Promise.all([
    loadUserEntries(user.id),
    loadPaymentMethods(user.id),
    loadWalletTransactions(user.id),
  ]);

  return {
    ...user,
    entries,
    paymentMethods,
    walletTransactions,
  };
}

async function createWalletTransaction({
  userId,
  kind,
  pointsDelta,
  usdAmount = null,
  paymentMethodId = null,
  description,
}) {
  await db.execute({
    sql: `
      INSERT INTO wallet_transactions (id, user_id, kind, points_delta, usd_amount, payment_method_id, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [crypto.randomUUID(), userId, kind, pointsDelta, usdAmount, paymentMethodId, description, new Date().toISOString()],
  });
}

async function createSeedPaymentMethod(userId, cardholder) {
  await db.execute({
    sql: `
      INSERT INTO payment_methods (id, user_id, cardholder, brand, last4, exp_month, exp_year, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `,
    args: [crypto.randomUUID(), userId, cardholder, DEFAULT_CARD_BRAND, "4242", 4, 2029, new Date().toISOString()],
  });
}

async function authFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const [id, secret] = token.split(".");
  if (!id || !secret) return null;

  const signature = signToken(`${id}.${secret}`);
  const tokenHash = sha256(secret);

  const result = await db.execute({
    sql: `
      SELECT s.user_id, s.expires_at, u.id, u.name, u.email, u.balance, u.email_verified_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.token_hash = ? AND s.signature = ?
      LIMIT 1
    `,
    args: [id, tokenHash, signature],
  });

  const row = result.rows[0];
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [id] });
    return null;
  }

  return serializeUser(row);
}

async function requireAuth(req, res, next) {
  const user = await authFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = user;
  next();
}

async function createSession(userId, res) {
  const sessionId = crypto.randomUUID();
  const secret = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const tokenHash = sha256(secret);
  const signed = signToken(`${sessionId}.${secret}`);

  await db.execute({
    sql: `
      INSERT INTO sessions (id, user_id, token_hash, signature, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [sessionId, userId, tokenHash, signed, expiresAt, new Date().toISOString()],
  });

  setSessionCookie(res, `${sessionId}.${secret}`);
}

async function getUserByEmail(email) {
  const result = await db.execute({
    sql: `
      SELECT id, name, email, balance, password_hash, password_salt, email_verified_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    args: [email],
  });

  return result.rows[0] || null;
}

async function consumeSingleUseToken(tableName, token) {
  const tokenHash = sha256(token);
  const result = await db.execute({
    sql: `
      SELECT id, user_id, expires_at, used_at
      FROM ${tableName}
      WHERE token_hash = ?
      LIMIT 1
    `,
    args: [tokenHash],
  });

  const row = result.rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await db.execute({
    sql: `UPDATE ${tableName} SET used_at = ? WHERE id = ?`,
    args: [new Date().toISOString(), row.id],
  });

  return row;
}

async function createActionToken(tableName, userId, durationMs) {
  const tokenId = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("hex");
  const fullToken = `${tokenId}.${secret}`;
  const tokenHash = sha256(fullToken);
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  await db.execute({
    sql: `DELETE FROM ${tableName} WHERE user_id = ? AND used_at IS NULL`,
    args: [userId],
  });
  await db.execute({
    sql: `
      INSERT INTO ${tableName} (id, user_id, token_hash, expires_at, created_at, used_at)
      VALUES (?, ?, ?, ?, ?, NULL)
    `,
    args: [tokenId, userId, tokenHash, expiresAt, new Date().toISOString()],
  });

  return fullToken;
}

async function deliverEmail({ to, subject, text, html, devLink }) {
  if (mailer) {
    await mailer.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    return { delivered: true, previewUrl: null };
  }

  console.log(`[mail-preview] ${subject} -> ${to}`);
  console.log(devLink);
  return { delivered: false, previewUrl: devLink };
}

function verificationLink(token) {
  return `${APP_ORIGIN}/?verify=${encodeURIComponent(token)}#account`;
}

function resetLink(token) {
  return `${APP_ORIGIN}/?reset=${encodeURIComponent(token)}#account`;
}

apiApp.get("/auth/session", async (req, res) => {
  const user = await authFromRequest(req);
  if (!user) {
    res.json({ user: null });
    return;
  }

  res.json({ user: await buildUserPayload(user) });
});

apiApp.post("/auth/signup", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const userId = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);
  await db.execute({
    sql: `
      INSERT INTO users (id, name, email, password_hash, password_salt, balance, created_at, email_verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    `,
    args: [userId, name, email, hash, salt, STARTING_BALANCE, new Date().toISOString()],
  });
  await createSeedPaymentMethod(userId, name);
  await createWalletTransaction({
    userId,
    kind: "opening_balance",
    pointsDelta: STARTING_BALANCE,
    description: "Opening wallet balance",
  });

  const token = await createActionToken("email_verification_tokens", userId, VERIFICATION_TOKEN_DURATION_MS);
  const link = verificationLink(token);
  const delivery = await deliverEmail({
    to: email,
    subject: "Verify your Apex Ledger email",
    text: `Verify your email: ${link}`,
    html: `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`,
    devLink: link,
  });

  res.status(201).json({
    ok: true,
    requiresVerification: true,
    message: "Account created. Verify your email before logging in.",
    devPreviewUrl: delivery.previewUrl,
  });
});

apiApp.post("/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const row = await getUserByEmail(email);

  if (!row) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  const candidate = hashPassword(password, row.password_salt);
  if (!safeCompare(candidate.hash, row.password_hash)) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  if (!row.email_verified_at) {
    res.status(403).json({ error: "Verify your email before logging in.", code: "EMAIL_NOT_VERIFIED" });
    return;
  }

  await createSession(row.id, res);
  res.json({ user: await buildUserPayload(row) });
});

apiApp.post("/auth/logout", async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];

  if (token) {
    const [id] = token.split(".");
    if (id) {
      await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [id] });
    }
  }

  clearSessionCookie(res);
  res.json({ ok: true });
});

apiApp.post("/auth/verify-email/request", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const row = await getUserByEmail(email);

  if (!row) {
    res.json({ ok: true, message: "If the account exists, a verification email has been sent." });
    return;
  }

  if (row.email_verified_at) {
    res.json({ ok: true, message: "If the account exists, a verification email has been sent." });
    return;
  }

  const token = await createActionToken("email_verification_tokens", row.id, VERIFICATION_TOKEN_DURATION_MS);
  const link = verificationLink(token);
  const delivery = await deliverEmail({
    to: row.email,
    subject: "Verify your Apex Ledger email",
    text: `Verify your email: ${link}`,
    html: `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`,
    devLink: link,
  });

  res.json({
    ok: true,
    message: "If the account exists, a verification email has been sent.",
    devPreviewUrl: delivery.previewUrl,
  });
});

apiApp.post("/auth/verify-email/confirm", async (req, res) => {
  const token = String(req.body.token || "").trim();
  if (!token) {
    res.status(400).json({ error: "Verification token is required." });
    return;
  }

  const record = await consumeSingleUseToken("email_verification_tokens", token);
  if (!record) {
    res.status(400).json({ error: "Verification link is invalid or expired." });
    return;
  }

  await db.execute({
    sql: "UPDATE users SET email_verified_at = ? WHERE id = ?",
    args: [new Date().toISOString(), record.user_id],
  });

  const user = await db.execute({
    sql: `
      SELECT id, name, email, balance, email_verified_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    args: [record.user_id],
  });

  const row = user.rows[0];
  await createSession(record.user_id, res);
  res.json({ user: await buildUserPayload(row) });
});

apiApp.post("/auth/password-reset/request", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const row = await getUserByEmail(email);

  if (!row) {
    res.json({ ok: true, message: "If the account exists, a password reset email has been sent." });
    return;
  }

  const token = await createActionToken("password_reset_tokens", row.id, PASSWORD_RESET_TOKEN_DURATION_MS);
  const link = resetLink(token);
  const delivery = await deliverEmail({
    to: row.email,
    subject: "Reset your Apex Ledger password",
    text: `Reset your password: ${link}`,
    html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`,
    devLink: link,
  });

  res.json({
    ok: true,
    message: "If the account exists, a password reset email has been sent.",
    devPreviewUrl: delivery.previewUrl,
  });
});

apiApp.post("/auth/password-reset/confirm", async (req, res) => {
  const token = String(req.body.token || "").trim();
  const password = String(req.body.password || "");

  if (!token || password.length < 8) {
    res.status(400).json({ error: "A valid reset token and a password with at least 8 characters are required." });
    return;
  }

  const record = await consumeSingleUseToken("password_reset_tokens", token);
  if (!record) {
    res.status(400).json({ error: "Reset link is invalid or expired." });
    return;
  }

  const { salt, hash } = hashPassword(password);
  await db.execute({
    sql: "UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?",
    args: [hash, salt, record.user_id],
  });
  await db.execute({
    sql: "DELETE FROM sessions WHERE user_id = ?",
    args: [record.user_id],
  });

  res.json({ ok: true, message: "Password updated. You can log in now." });
});

apiApp.post("/entries", requireAuth, async (req, res) => {
  const race = String(req.body.race || "").trim();
  const tier = String(req.body.tier || "").trim();
  const amount = Number(req.body.amount || 0);
  const predictions = Array.isArray(req.body.predictions) ? req.body.predictions : [];

  if (!race || !tier || amount < 10 || predictions.length !== 10) {
    res.status(400).json({ error: "Invalid entry payload." });
    return;
  }

  if (amount > req.user.balance) {
    res.status(400).json({ error: "Not enough balance." });
    return;
  }

  const existingEntry = await db.execute({
    sql: `
      SELECT id
      FROM entries
      WHERE user_id = ? AND race = ?
      LIMIT 1
    `,
    args: [req.user.id, race],
  });

  if (existingEntry.rows[0]) {
    res.status(409).json({ error: "You can only make one entry per race." });
    return;
  }

  const nextBalance = req.user.balance - amount;
  await db.batch(
    [
      {
        sql: "UPDATE users SET balance = ? WHERE id = ?",
        args: [nextBalance, req.user.id],
      },
      {
        sql: `
          INSERT INTO entries (id, user_id, race, tier, amount, predictions_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          crypto.randomUUID(),
          req.user.id,
          race,
          tier,
          amount,
          JSON.stringify(predictions),
          new Date().toISOString(),
        ],
      },
    ],
    "write",
  );
  await createWalletTransaction({
    userId: req.user.id,
    kind: "entry_hold",
    pointsDelta: -amount,
    description: `${tier} entry reserved for ${race}`,
  });

  res.status(201).json({ user: await buildUserPayload(req.user.id) });
});

apiApp.post("/wallet/reset", requireAuth, async (req, res) => {
  await db.execute({
    sql: "UPDATE users SET balance = ? WHERE id = ?",
    args: [STARTING_BALANCE, req.user.id],
  });
  await db.execute({
    sql: "DELETE FROM entries WHERE user_id = ?",
    args: [req.user.id],
  });
  await db.execute({
    sql: "DELETE FROM wallet_transactions WHERE user_id = ?",
    args: [req.user.id],
  });
  await createWalletTransaction({
    userId: req.user.id,
    kind: "opening_balance",
    pointsDelta: STARTING_BALANCE,
    description: "Opening wallet balance",
  });

  res.json({ user: await buildUserPayload(req.user.id) });
});

apiApp.post("/wallet/payment-methods", requireAuth, async (req, res) => {
  const cardholder = String(req.body.cardholder || "").trim();
  const brand = String(req.body.brand || "").trim();
  const last4 = String(req.body.last4 || "").trim();
  const expMonth = Number(req.body.expMonth || 0);
  const expYear = Number(req.body.expYear || 0);

  if (!cardholder || !brand || !/^\d{4}$/.test(last4) || expMonth < 1 || expMonth > 12 || expYear < new Date().getFullYear()) {
    res.status(400).json({ error: "Enter a valid masked card profile." });
    return;
  }

  const existing = await loadPaymentMethods(req.user.id);
  if (!existing.length) {
    await db.execute({
      sql: "UPDATE payment_methods SET is_default = 0 WHERE user_id = ?",
      args: [req.user.id],
    });
  }

  await db.execute({
    sql: `
      INSERT INTO payment_methods (id, user_id, cardholder, brand, last4, exp_month, exp_year, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [crypto.randomUUID(), req.user.id, cardholder, brand, last4, expMonth, expYear, existing.length ? 0 : 1, new Date().toISOString()],
  });

  res.status(201).json({ user: await buildUserPayload(req.user.id) });
});

apiApp.post("/wallet/payment-methods/:id/default", requireAuth, async (req, res) => {
  const methodId = String(req.params.id || "").trim();
  const result = await db.execute({
    sql: "SELECT id FROM payment_methods WHERE id = ? AND user_id = ? LIMIT 1",
    args: [methodId, req.user.id],
  });

  if (!result.rows[0]) {
    res.status(404).json({ error: "Payment method not found." });
    return;
  }

  await db.execute({
    sql: "UPDATE payment_methods SET is_default = 0 WHERE user_id = ?",
    args: [req.user.id],
  });
  await db.execute({
    sql: "UPDATE payment_methods SET is_default = 1 WHERE id = ?",
    args: [methodId],
  });

  res.json({ user: await buildUserPayload(req.user.id) });
});

apiApp.delete("/wallet/payment-methods/:id", requireAuth, async (req, res) => {
  const methodId = String(req.params.id || "").trim();
  const result = await db.execute({
    sql: "SELECT id, is_default FROM payment_methods WHERE id = ? AND user_id = ? LIMIT 1",
    args: [methodId, req.user.id],
  });
  const method = result.rows[0];

  if (!method) {
    res.status(404).json({ error: "Payment method not found." });
    return;
  }

  await db.execute({
    sql: "DELETE FROM payment_methods WHERE id = ?",
    args: [methodId],
  });

  if (method.is_default) {
    const nextMethod = await db.execute({
      sql: "SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
      args: [req.user.id],
    });
    if (nextMethod.rows[0]) {
      await db.execute({
        sql: "UPDATE payment_methods SET is_default = 1 WHERE id = ?",
        args: [nextMethod.rows[0].id],
      });
    }
  }

  res.json({ user: await buildUserPayload(req.user.id) });
});

apiApp.post("/wallet/top-up", requireAuth, async (req, res) => {
  const points = Number(req.body.points || 0);
  const usdAmount = Number(req.body.usdAmount || 0);
  const paymentMethodId = String(req.body.paymentMethodId || "").trim();

  if (points <= 0 || usdAmount <= 0 || !paymentMethodId) {
    res.status(400).json({ error: "Select a payment method and a valid point package." });
    return;
  }

  const methodResult = await db.execute({
    sql: "SELECT id, brand, last4 FROM payment_methods WHERE id = ? AND user_id = ? LIMIT 1",
    args: [paymentMethodId, req.user.id],
  });
  const method = methodResult.rows[0];

  if (!method) {
    res.status(404).json({ error: "Payment method not found." });
    return;
  }

  const nextBalance = req.user.balance + points;
  await db.execute({
    sql: "UPDATE users SET balance = ? WHERE id = ?",
    args: [nextBalance, req.user.id],
  });
  await createWalletTransaction({
    userId: req.user.id,
    kind: "top_up",
    pointsDelta: points,
    usdAmount,
    paymentMethodId: method.id,
    description: `Points purchased with ${method.brand} ending ${method.last4}`,
  });

  res.json({ user: await buildUserPayload(req.user.id) });
});

let schemaReadyPromise;

export async function ensureSchemaReady() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureSchema();
  }

  await schemaReadyPromise;
}

export { apiApp };

if (process.env.NETLIFY !== "true") {
  async function startLocalServer() {
    const app = express();
    app.use("/api", apiApp);
    app.use(express.static(__dirname));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "index.html"));
    });

    await ensureSchemaReady();

    app.listen(PORT, () => {
      console.log(`Apex Ledger backend running on http://localhost:${PORT}`);
    });
  }

  startLocalServer().catch((error) => {
    console.error("Failed to start Apex Ledger:", error);
    process.exit(1);
  });
}
