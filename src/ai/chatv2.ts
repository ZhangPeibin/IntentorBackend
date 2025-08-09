// src/openai/chatCompletionIntent.ts
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';
import { addressAssets } from '../api/okxApi';
import { resolveTokenSymbol } from './assistantsFile';
import { SYSTEM_PROMPT } from './promptv2';
import { getTokenInfoTool } from './tools';
import { getChatHistory, saveChatMessage } from '../db/gptHistoryCache';

const proxyUrl = 'socks5://127.0.0.1:7898';
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey,
  httpAgent: agent,
});



export async function askIntentWithTools(chainId: string, address: string, message: string) {
  const systemPrompt = SYSTEM_PROMPT();
  const userChatHistory = await getChatHistory(address);
  const portfolio = await addressAssets(chainId, address);

  const history = [
    {
      role: 'system',
      content: systemPrompt
    },
    ...userChatHistory.map((h: any) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    {
      role: 'user',
      content: `My address is ${address}, and I use chain ${chainId}. My message is: ${message}, and here is my portfolio: ${JSON.stringify(portfolio)}`
    }
  ];

  const maxRetries = 4;
  let completed = false;
  let gptReply = '';

  for (let i = 0; i < maxRetries && !completed; i++) {
    console.log('Attempting to get response from OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: history,
      tools: getTokenInfoTool,
      tool_choice: 'auto',
      store: true,

    });

    const conent = completion.choices[0].message.content;
    console.log('OpenAI response content:', conent);
    if (conent && conent.trim() !== '') {
      completed = true;
      gptReply = conent;
      console.log('OpenAI response:', conent);
      break
    }

    const reply = completion.choices[0].message;
    history.push(reply);

    console.log('Retrying... Attempt:', i + 1);

    const toolCalls = reply.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      console.log('toolCalls', toolCalls);

      for (const toolCall of toolCalls) {
        console.log("processing tool call", toolCall);
        const args = JSON.parse(toolCall.function.arguments);
        if (toolCall.function.name === 'getTokenInfo') {
          const tokenInfo = await resolveTokenSymbol(args.chainId, args.tokenSymbol);
          history.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(tokenInfo)
          });
        }

      }


      // const response2 = await openai.chat.completions.create({
      //   model: "gpt-4.1",
      //   messages: history,
      //   tools: getTokenInfoTool,
      //   store: true,
      // });
    }

  }
  
  await saveChatMessage(address, 'user', message);
  await saveChatMessage(address, 'assistant', gptReply);

  try {
    return JSON.parse(gptReply);
  } catch (err) {
    return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
  }
}





// const toolCalls = reply.tool_calls;
// if (toolCalls && toolCalls.length > 0) {
//   console.log('toolCalls', toolCalls);
//   console.log("toolCalls params", toolCalls[0].function.arguments);
//   const toolCall = toolCalls[0];
//   const args = JSON.parse(toolCall.function.arguments);

//   if (toolCall.function.name === 'getTokenInfo') {
//     const tokenInfo = await resolveTokenSymbol(args.chainId, args.tokenSymbol);
//     console.log('Token Info:', tokenInfo);
//     history.push({
//       role: 'tool',
//       tool_call_id: toolCall.id,
//       content: JSON.stringify(tokenInfo)
//     });
//   }
// }

// const response2 = await openai.chat.completions.create({
//   model: "gpt-4.1",
//   messages: history,
//   tools: getTokenInfoTool,
//   store: true,
// });

// const gptReply = response2.choices[0].message.content || '{}';;

// await saveChatMessage(address, 'user', message);
// await saveChatMessage(address, 'assistant', gptReply);

// try {
//   return JSON.parse(gptReply);
// } catch (err) {
//   return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
// }
// }
