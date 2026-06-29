import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');

let db: Database.Database;

export function initDb(): Database.Database {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  db = new Database(path.join(dataDir, 'app.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      date_of_birth TEXT NOT NULL,
      mobile TEXT,
      birthday_email_sent_year INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sr INTEGER NOT NULL,
      org_name TEXT NOT NULL,
      csv_name TEXT NOT NULL,
      logo_name TEXT,
      logo_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try { db.exec(`ALTER TABLE employees ADD COLUMN birthday_email_sent_year INTEGER`); } catch {}
  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}
