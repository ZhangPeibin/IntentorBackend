// uploadTokenList.ts

import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { SUPPORTED_CHAINS } from '../token/tokenconfig';
import { hashFile } from '../utils/file';
import { deleteTokenFile, getTokenFileByName, insertTokenFile } from '../db/sql/token';
dotenv.config();

const proxyUrl = 'socks5://127.0.0.1:7898';
const agent = new SocksProxyAgent(proxyUrl);

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: apiKey,
    httpAgent: agent
});


const assistantId = 'asst_qap93VhzYxqFYFK4c0Dyi8MB';
const vectorStoreId = 'vs_68650fa14a288191838bb9bddc297fcc';
const threadId = 'thread_8UUeo1tkRqa2UFIK6p4tQG0d';

export async function uploadAndAttach(chainId: string) {
    try {

        const filePath = path.resolve(__dirname, `../../tokenlist_${chainId}.json`);
        const fileName = path.basename(filePath);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }

        const fileHash = await hashFile(filePath);
        console.log(`File hash for ${fileName}: ${fileHash}`);

        const oldFileInfo = await getTokenFileByName(fileName);
        if (oldFileInfo && oldFileInfo.hash === fileHash) {
            console.log(`File ${fileName} hash matches the database, no need to upload.`);
            return;
        }
        console.log(`File ${fileName} hash has changed or does not exist in the database, proceeding with upload.`);

        const gptFile = await openai.files.create({
            purpose: 'assistants',
            file: fs.createReadStream(filePath) as any
        });
        console.log(`File uploaded: ${gptFile.id}`);
        await openai.vectorStores.fileBatches.createAndPoll(
            vectorStoreId,
            {
                file_ids: [gptFile.id]
            }
        );

        console.log('Files uploaded to vector store.');

        await openai.beta.assistants.update(assistantId, {
            tool_resources: {
                file_search: {
                    vector_store_ids: [vectorStoreId], // 替换为你的 vector store ID
                },
            },
        });
        if (oldFileInfo) {
            console.log(`Deleting old file with hash: ${oldFileInfo.hash}`);
            const oldFileId = oldFileInfo.id;
            await openai.files.del(oldFileId);
            console.log(`Old file with ID ${oldFileId} deleted.`);
            await deleteTokenFile(oldFileInfo.hash);

        }

        await insertTokenFile(fileHash, fileName, gptFile.id);

        console.log('Assistant updated with vector store.');

    } catch (error) {
        console.error('Error in uploadAndAttach:', error);
    }
}

export async function resolveTokenSymbol(chainId: string, symbol: string) {
    console.log('resolveTokenSymbol', chainId, symbol);
    await openai.beta.threads.messages.create(
        threadId,
        {
            role: 'user',
            content: `chainId:${chainId},TokenSymbol:${symbol}.`
        });

    const run = await openai.beta.threads.runs.create(
        threadId,
        {
            assistant_id: assistantId,
        }
    );
    let runStatus;
    do {
        await new Promise(r => setTimeout(r, 500));
        runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
        );
        console.log('runStatus', runStatus.status);
        if(runStatus.status === 'failed') {
            console.error('Run failed:', runStatus);
            return;
        }
    } while (runStatus.status !== 'completed');
    const messages = await openai.beta.threads.messages.list(threadId);
    const last = messages.data.find(m => m.role === 'assistant');
    const textContent = last?.content.find(c => c.type === 'text');
    const gptReply = textContent && 'text' in textContent ? textContent.text.value : '{}';
    return gptReply;
}