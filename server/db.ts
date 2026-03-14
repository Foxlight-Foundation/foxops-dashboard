import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import os from 'os';

const dbDir = process.env.FOXOPS_DB_DIR || path.join(os.homedir(), '.foxops');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(path.join(dbDir, 'foxops.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    mfa_secret TEXT,
    mfa_enrolled_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kill_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    session_key TEXT NOT NULL,
    session_id TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS tenant_memberships (
    user_id INTEGER NOT NULL,
    tenant_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'operator', 'viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export interface DbUser {
  id: number;
  email: string;
  username: string | null;
  password_hash: string | null;
  google_id: string | null;
  mfa_secret: string | null;
  mfa_enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  email: string;
  username: string | null;
  google_id: string | null;
  mfa_enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

const stmt = {
  findById: db.prepare<[number], DbUser>('SELECT * FROM users WHERE id = ?'),
  findByEmail: db.prepare<[string], DbUser>('SELECT * FROM users WHERE email = ?'),
  findByGoogleId: db.prepare<[string], DbUser>('SELECT * FROM users WHERE google_id = ?'),
  insert: db.prepare<[string, string | null, string | null, string | null], { lastInsertRowid: number | bigint }>(
    'INSERT INTO users (email, username, password_hash, google_id) VALUES (?, ?, ?, ?)',
  ),
  linkGoogle: db.prepare<[string, number]>('UPDATE users SET google_id = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  setMfa: db.prepare<[string, number]>('UPDATE users SET mfa_secret = ?, mfa_enrolled_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?'),
  setPassword: db.prepare<[string, number]>('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  count: db.prepare<[], { count: number }>('SELECT COUNT(*) as count FROM users'),
  all: db.prepare<[], PublicUser>('SELECT id, email, username, google_id, mfa_enrolled_at, created_at, updated_at FROM users ORDER BY created_at'),
};

export const findUserById = (id: number): DbUser | undefined => stmt.findById.get(id);
export const findUserByEmail = (email: string): DbUser | undefined => stmt.findByEmail.get(email);
export const findUserByGoogleId = (googleId: string): DbUser | undefined => stmt.findByGoogleId.get(googleId);
export const getAllUsers = (): PublicUser[] => stmt.all.all();
export const userCount = (): number => stmt.count.get()!.count;

export const createUser = (data: { email: string; username?: string; password?: string; googleId?: string }): DbUser => {
  const hash = data.password ? bcrypt.hashSync(data.password, 12) : null;
  const result = stmt.insert.run(data.email, data.username ?? null, hash, data.googleId ?? null);
  return findUserById(Number(result.lastInsertRowid))!;
};

export const linkGoogleId = (userId: number, googleId: string): void => { stmt.linkGoogle.run(googleId, userId); };
export const setMfaSecret = (userId: number, secret: string): void => { stmt.setMfa.run(secret, userId); };
export const setPassword = (userId: number, password: string): void => { stmt.setPassword.run(bcrypt.hashSync(password, 12), userId); };

export const verifyPassword = (user: DbUser, password: string): boolean => {
  if (!user.password_hash) return false;
  return bcrypt.compareSync(password, user.password_hash);
};

const killLogInsert = db.prepare<[string, string, string | null, string, string | null]>(
  'INSERT INTO kill_log (session_key, session_id, reason, status, note) VALUES (?, ?, ?, ?, ?)',
);

export const insertKillLog = (entry: {
  sessionKey: string;
  sessionId: string;
  reason?: string;
  status: string;
  note?: string;
}): void => {
  killLogInsert.run(entry.sessionKey, entry.sessionId, entry.reason ?? null, entry.status, entry.note ?? null);
};

export const seedAdminUser = (email: string, password: string): void => {
  if (userCount() > 0) return;
  createUser({ email, password, username: 'admin' });
  console.log(`[foxops] Admin user seeded: ${email}`);
};

// ── Tenant membership helpers ──────────────────────────────────────────────

export interface TenantMembership {
  user_id: number;
  tenant_id: string;
  role: 'owner' | 'admin' | 'operator' | 'viewer';
  created_at: string;
}

const membershipStmt = {
  byUserId: db.prepare<[number], TenantMembership>('SELECT * FROM tenant_memberships WHERE user_id = ?'),
  byTenant: db.prepare<[string], TenantMembership & { email: string; username: string | null }>(
    `SELECT tm.*, u.email, u.username FROM tenant_memberships tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.tenant_id = ?
     ORDER BY tm.created_at`,
  ),
  insert: db.prepare<[number, string, string]>(
    'INSERT INTO tenant_memberships (user_id, tenant_id, role) VALUES (?, ?, ?)',
  ),
  update: db.prepare<[string, number, string]>(
    'UPDATE tenant_memberships SET role = ? WHERE user_id = ? AND tenant_id = ?',
  ),
  remove: db.prepare<[number, string]>(
    'DELETE FROM tenant_memberships WHERE user_id = ? AND tenant_id = ?',
  ),
};

export const getMembershipsByUserId = (userId: number): TenantMembership[] => membershipStmt.byUserId.all(userId);

export const getMembershipsByTenant = (tenantId: string): (TenantMembership & { email: string; username: string | null })[] =>
  membershipStmt.byTenant.all(tenantId);

export const addTenantMembership = (userId: number, tenantId: string, role: string): void => {
  membershipStmt.insert.run(userId, tenantId, role);
};

export const updateTenantMembership = (userId: number, tenantId: string, role: string): void => {
  membershipStmt.update.run(role, userId, tenantId);
};

export const removeTenantMembership = (userId: number, tenantId: string): void => {
  membershipStmt.remove.run(userId, tenantId);
};
