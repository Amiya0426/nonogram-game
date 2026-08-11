import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'app.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    puzzle_json TEXT NOT NULL,
    puzzle_id TEXT REFERENCES puzzles(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS puzzles (
    id TEXT PRIMARY KEY,
    rows INTEGER NOT NULL,
    cols INTEGER NOT NULL,
    row_clues TEXT NOT NULL,
    col_clues TEXT NOT NULL,
    grid TEXT,
    source TEXT NOT NULL DEFAULT 'import',
    density REAL NOT NULL DEFAULT 0,
    content_hash TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, puzzle_id)
  );

  CREATE TABLE IF NOT EXISTS email_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip TEXT,
    sent_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzles_hash ON puzzles(content_hash);
  CREATE INDEX IF NOT EXISTS idx_puzzles_size ON puzzles(rows, cols);
  CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
  CREATE INDEX IF NOT EXISTS idx_email_sends_sent ON email_sends(sent_at);
  CREATE INDEX IF NOT EXISTS idx_email_sends_email ON email_sends(email);
`);

// 已有数据库迁移：补充 user_id / puzzle_id 列与索引
const puzzlesCols = db.prepare('PRAGMA table_info(puzzles)').all().map((c) => c.name);
if (!puzzlesCols.includes('user_id')) {
  db.exec('ALTER TABLE puzzles ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;');
}
if (!puzzlesCols.includes('name')) {
  db.exec('ALTER TABLE puzzles ADD COLUMN name TEXT;');
}
const collectionsCols = db.prepare('PRAGMA table_info(collections)').all().map((c) => c.name);
if (!collectionsCols.includes('puzzle_id')) {
  db.exec('ALTER TABLE collections ADD COLUMN puzzle_id TEXT REFERENCES puzzles(id) ON DELETE SET NULL;');
}
const usersCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!usersCols.includes('email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_puzzles_user ON puzzles(user_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_collections_puzzle ON collections(puzzle_id);');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);');
