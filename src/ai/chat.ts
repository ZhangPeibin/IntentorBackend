// src/openai/chat.ts
import { OpenAI } from 'openai';
import { SYSTEM_PROMPT } from './promptv2';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getChatHistory, saveChatMessage } from '../db/gptHistoryCache';
import { addressAssets } from '../api/okxApi';

const proxyUrl = 'socks5://127.0.0.1:7898'; 
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
  httpAgent: agent
});

export async function askIntent(chainId: string, address: string, message: string) {
  const systemPrompt = SYSTEM_PROMPT();
  const history = await getChatHistory(address);
 
  const portfolio = await addressAssets(chainId, address);
  const portfolipSystem = `You have access to the user's portfolio on chain ${chainId}. Here is the portfolio data: ${JSON.stringify(portfolio)}`;
  console.log('portfolipSystem', portfolipSystem);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: portfolipSystem },
    ...history.map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: message }]
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: messages,
    temperature: 0.3,
  });
  const gptReply = completion.choices[0].message.content || '{}';
  console.log('ai_res', gptReply)
  await saveChatMessage(address, 'user', message);
  await saveChatMessage(address, 'assistant', gptReply);

  try {
    return JSON.parse(gptReply);
  } catch (err) {
    return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
  }
}
