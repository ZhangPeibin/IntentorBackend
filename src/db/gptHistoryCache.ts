import redis from './redis';
import { initDb } from './sql/gptHistory';


export async function getChatHistory(wallet: string) {
  const cacheKey = `chat:${wallet}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const db = await initDb();
  const rows = await db.all(
    `SELECT role, content FROM chat_history WHERE wallet = ? ORDER BY created_at ASC`,
    wallet
  );

  await redis.set(cacheKey, JSON.stringify(rows), { EX: 60 * 60 * 24 * 7  }); 
  return rows;
}

export async function saveChatMessage(wallet: string, role: 'user' | 'assistant', content: string) {
  const db = await initDb();
  await db.run(
    `INSERT INTO chat_history (wallet, role, content) VALUES (?, ?, ?)`,
    wallet,
    role,
    content
  );

  // 更新 Redis 缓存（追加）
  const cacheKey = `chat:${wallet}`;
  const existing = await redis.get(cacheKey);
  let messages = existing ? JSON.parse(existing) : [];
  messages.push({ role, content });
  await redis.set(cacheKey, JSON.stringify(messages), { EX: 60 * 60 * 7  });
}

export async function clearChatHistory(wallet: string) {
  const db = await initDb();
  await db.run(`DELETE FROM chat_history WHERE wallet = ?`, wallet);

  // 清除 Redis 缓存
  const cacheKey = `chat:${wallet}`;
  await redis.del(cacheKey);
}