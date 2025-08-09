// src/openai/chat.ts
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getChatHistory, saveChatMessage } from '../db/gptHistoryCache';
import { okxClient } from '../api/okxDexClient';
import { SYSTEM_PROMPT } from './prompt';
import { addressAssets, allToken } from '../api/okxApi';
import { resolveTokenSymbol } from './assistantsFile';
import { start } from 'repl';
import { tools } from './tools';

const proxyUrl = 'socks5://127.0.0.1:7898'; // 替换为你的 VPN 代理地址和端口
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey,
    httpAgent: agent
});

// 用于缓存用户线程 ID（实际可用 Redis）
const userThreadMap = new Map<string, string>();
let assistantId = 'asst_Jd5FTXITz4aB8tdoI2j9dFaa';

async function setupAssistant() {
    if (assistantId) return assistantId;
    const systemPrompt = SYSTEM_PROMPT();

    const assistant = await openai.beta.assistants.create({
        name: 'Web3 Assistant',
        instructions: systemPrompt,
        tools: tools,
        model: 'gpt-4.1'
    });
    assistantId = assistant.id;
    return assistantId;
}

export async function askIntent(chainId: string, address: string, message: string) {
    let startTime = Date.now();
    const assistantId = await setupAssistant();
    console.log("used time setUpAssistant", Date.now() - startTime, 'ms');
    let threadId = userThreadMap.get(address);
    if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        userThreadMap.set(address, threadId);
    }
    startTime = Date.now();
    await openai.beta.threads.messages.create(
        threadId,
        {
            role: 'user',
            content: `My address is ${address}, and I use chain ${chainId}.And My message is: ${message}`
        });

    console.log("used time create Message ", Date.now() - startTime, 'ms');

    // await openai.beta.threads.messages.create(
    //     threadId,
    //     {
    //         role: 'user',
    //         content: message
    //     }
    // );
    startTime = Date.now();

    const run = await openai.beta.threads.runs.create(
        threadId,
        {
            assistant_id: assistantId,
        }
    );
    console.log("used time create run ", Date.now() - startTime, 'ms');

        startTime = Date.now();

    let runStatus;
    do {
        await new Promise(r => setTimeout(r, 100));
        runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
        );

        // 如果需要调用工具函数
        console.log('runStatus', runStatus.status);

        if (runStatus.status === 'requires_action' && runStatus.required_action) {
            const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

            const toolOutputs = await Promise.all(toolCalls.map(async (toolCall: any) => {
                const fnName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);


                if (fnName === 'getPortfolio') {
                                        const portfolioStartTime = Date.now();

                    const portfolio = await addressAssets(args.chainId, args.address);
                    console.log("used time getPortfolio ", Date.now() - portfolioStartTime, 'ms');
                    return {
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(portfolio)
                    };
                }else if (fnName === 'getTokenInfo') {
                    const tokenInfoStartTime = Date.now();
                    const tokenInfo = await resolveTokenSymbol(args.chainId, args.tokenSymbol);
                    console.log("used time getTokenInfo ", Date.now() - tokenInfoStartTime, 'ms');
                    return {
                        tool_call_id: toolCall.id,
                        output: JSON.stringify(tokenInfo)
                    };
                }

                return {
                    tool_call_id: toolCall.id,
                    output: 'Function not implemented'
                };
            }));
            await openai.beta.threads.runs.submitToolOutputs(
                threadId,
                run.id,
                {
                    tool_outputs: toolOutputs
                }
            );
        }
    } while (runStatus.status !== 'completed');

    console.log("used time create processed ", Date.now() - startTime, 'ms');

    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data.find(m => m.role === 'assistant');
    const textContent = last?.content.find(c => c.type === 'text');
    const gptReply = textContent && 'text' in textContent ? textContent.text.value : '{}';

    console.log('ai_res', gptReply);

    await saveChatMessage(address, 'user', message);
    await saveChatMessage(address, 'assistant', gptReply);

    try {
        return JSON.parse(gptReply);
    } catch (err) {
        return { intent: 'unknown', error: 'Failed to parse JSON from OpenAI response' };
    }
}
