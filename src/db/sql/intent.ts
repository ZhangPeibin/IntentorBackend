import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let intentLogDb: Database | null = null;


export async function getIntentDB(): Promise<Database> {
  if (intentLogDb) return intentLogDb;

  intentLogDb = await open({
    filename: './intent-log.sqlite',
    driver: sqlite3.Database,
  });

  await intentLogDb.exec(`
    CREATE TABLE IF NOT EXISTS intent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      user_message TEXT,
      parsed_intent TEXT
    )
  `);

  return intentLogDb;
}


export async function logIntent(message: string, parsed: any) {
  const db = await getIntentDB();
  const timestamp = new Date().toISOString();
  const parsedStr = JSON.stringify(parsed);

  await db.run(
    `INSERT INTO intent_logs (timestamp, user_message, parsed_intent) VALUES (?, ?, ?)`,
    [timestamp, message, parsedStr]
  );
}

