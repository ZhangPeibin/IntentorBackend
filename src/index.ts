// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import intentRouter from './router/intent';
import verifyRouter from './router/verify';
import dexRouter from './router/dex';
import { clearChatHistory } from './db/gptHistoryCache';
import { globalParamChecker } from './middlewares/globalParamChecker';
import redis from './db/redis';
import { startTokenCacheJob } from './token/tokenlistService';
import { resolveTokenSymbol } from './ai/assistantsFile';

dotenv.config();
startTokenCacheJob(); 

const app = express();
const port = process.env.PORT || 4000 ;

app.use(cors());
app.use(express.json());
app.use(globalParamChecker as any)

app.use('/api/intent', intentRouter);

app.use('/api/verify', verifyRouter);

app.use('/api/dex', dexRouter);

app.get('/api/clear', async (req, res) => {
  const address = req.query.address as string;
  if (!address) {
    res.json({ ok: false, error: 'Missing wallet address' });
  } else {
    await clearChatHistory(address);
    const cacheKey = `chat:${address}`;
    await redis.del(cacheKey);
    res.json({ ok: true, message: 'Chat history cleared' });
  }
});

app.get('/api/symbol', async (req, res) => {
  const chainId = req.query.chainId as string;
  const symbol = req.query.symbol as string;
  if (!chainId || !symbol) {
    res.json({ ok: false, error: 'Missing wallet address' });
  } else {
    const r = await resolveTokenSymbol(chainId, symbol);
    res.json({ ok: true, message: r });
  }
});

app.listen(port, () => {
  console.log(`Web3Mind server is running at http://localhost:${port}`);
});
