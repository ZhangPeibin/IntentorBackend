// src/utils/tokenCache.ts
import { createClient } from 'redis';
import axios from 'axios';
import redis from '../db/redis';
import { allToken } from '../api/okxApi';
import { getTokenBySymbol, insertOrUpdateTokenList } from '../db/sql/token';
import fs from 'fs/promises';
import { uploadAndAttach } from '../ai/assistantsFile';
import { SUPPORTED_CHAINS } from './tokenconfig';


export async function refreshTokenList() {
    for (const chainId of SUPPORTED_CHAINS) {
        try {
            const response = await allToken(chainId);

            const tokens = response.data || [];

            if (tokens.length == 0) {
                continue;
            }

            console.log(`🔄 Refreshing token list for chain ${chainId} with ${tokens.length} tokens`);
            await insertOrUpdateTokenList(chainId, tokens);

            for (const token of tokens) {
                const symbolKey = `token:${chainId}:${token.tokenSymbol.toUpperCase()}`;
                await redis.set(symbolKey, JSON.stringify(token));
            }

            await saveTokenListToFile(tokens, `./tokenlist_${chainId}.json`);
            console.log(`✅ Refreshed token list for chain ${chainId}`);

            await uploadAndAttach(chainId);
            await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (err) {
            console.error(`❌ Failed to fetch token list for chain ${chainId}`, err);
        }
    }
}

export function startTokenCacheJob() {
    refreshTokenList(); // 首次启动
    setInterval(refreshTokenList, 1000 * 60 * 10);
}


async function saveTokenListToFile(tokens: [], filePath = './tokenlist.json') {
    try {
        if (tokens.length === 0) {
            console.warn('No tokens to save, skipping file write.');
            return;
        }
        await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), 'utf-8');
        console.log(`Saved ${tokens.length} tokens to ${filePath}`);
    } catch (error) {
        console.error('Failed to save token list file:', error);
    }
}


export async function getTokenAddress(chainId: string, symbol: string) {
    const key = `token:${chainId}:${symbol.toUpperCase()}`;
    const token = await redis.get(key);

    if (token) return token;

    try {
        const tokenInfo = await getTokenBySymbol(chainId, symbol.toUpperCase());
        if (tokenInfo) {
            const tokenAddress = tokenInfo.tokenContractAddress;
            if (tokenAddress) {
                await redis.set(key, JSON.stringify(tokenInfo));
                return tokenAddress;
            }
        }

        return '';
    } catch {
        return '';
    }
}
