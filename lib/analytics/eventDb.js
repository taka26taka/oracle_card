import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DEFAULT_DB_PATH = "/tmp/oracle-events.sqlite";

let db = null;

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

const createDatabase = () => {
  const dbPath = process.env.EVENT_DB_PATH || DEFAULT_DB_PATH;
  ensureDir(dbPath);
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("synchronous = NORMAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      event_normalized TEXT NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      date_key TEXT NOT NULL,
      path TEXT NOT NULL,
      theme TEXT,
      card_id INTEGER,
      attempt_id TEXT,
      page_name TEXT,
      meta_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_date_normalized ON events(date_key, event_normalized);
    CREATE INDEX IF NOT EXISTS idx_events_event_attempt ON events(event, attempt_id);
    CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date_key);
  `);
  return instance;
};

export const getEventDb = () => {
  if (db) return db;
  db = createDatabase();
  return db;
};
