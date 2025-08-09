import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';


let gptHistoryDb: Database | null = null;

export async function initDb() {
  if (!gptHistoryDb) {
    gptHistoryDb = await open({
      filename: './gpt_history.db',
      driver: sqlite3.Database
    });

    await gptHistoryDb.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return gptHistoryDb;
}

export async function saveMessage(wallet: string, role: 'user' | 'assistant', content: string) {
  const db = await initDb();
  await db.run(
    `INSERT INTO chat_history (wallet, role, content) VALUES (?, ?, ?)`,
    wallet,
    role,
    content
  );
}

export async function getChatHistory(wallet: string) {
  const db = await initDb();
  return db.all(
    `SELECT role, content FROM chat_history WHERE wallet = ? ORDER BY created_at ASC`,
    wallet
  );
}