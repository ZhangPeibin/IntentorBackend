import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
export interface TokenMeta {
    chainId: string;
    tokenSymbol: string;
    tokenContractAddress: string;
    decimals?: number;
    tokenName?: string;
    tokenLogoUrl?: string;
}

let db: Database | null = null;

export async function initDb() {
    if (!db) {
        db = await open({
            filename: './token.db',
            driver: sqlite3.Database
        });

        await db.run(`
      CREATE TABLE IF NOT EXISTS token (
        chainId TEXT,
        symbol TEXT,
        name TEXT,
        address TEXT,
        logo TEXT,
        decimals INTEGER,
        PRIMARY KEY (chainId, address)
      )
    `);

        await db.run(`
      CREATE TABLE IF NOT EXISTS tokenFile (
        hash TEXT,
        name TEXT,
        id TEXT,
        PRIMARY KEY (hash)
      )
    `);
    }
    return db;
}

export async function insertTokenFile(hash: string, name: string, id: string) {
    const db = await initDb();
    await db.run(`
    INSERT INTO tokenFile (hash, name, id)
    VALUES (?, ?, ?)
    ON CONFLICT(hash) DO UPDATE SET
      name = excluded.name,
      id = excluded.id
  `, [hash, name, id]);
}

export async function deleteTokenFile(hash: string) {
    const db = await initDb();
    await db.run(`
    DELETE FROM tokenFile WHERE hash = ?
  `, [hash]);
}

export async function getTokenFileByName(name: string) {
    const db = await initDb();
    const row = await db.get(`
    SELECT * FROM tokenFile WHERE name = ?  
    `, [name]);
    if (!row) return null;
    return {
        hash: row.hash,
        name: row.name,
        id: row.id
    };
}


export async function insertOrUpdateToken(token: TokenMeta) {
    const db = await initDb();
    await db.run(`
    INSERT INTO token (chainId, symbol, name, address, logo, decimals)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(chainId, address) DO UPDATE SET
      symbol = excluded.symbol,
      name = excluded.name,
      logo = excluded.logo,
      decimals = excluded.decimals
  `, [
        token.chainId,
        token.tokenSymbol,
        token.tokenName || '',
        token.tokenContractAddress,
        token.tokenLogoUrl || '',
        token.decimals ?? null
    ]);
}

export async function insertOrUpdateTokenList(chainId: string, tokens: TokenMeta[]) {
    const db = await initDb();
    const insert = await db.prepare(`
    INSERT INTO token (chainId, symbol, name, address, logo, decimals)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(chainId, address) DO UPDATE SET
      symbol = excluded.symbol,
      name = excluded.name,
      logo = excluded.logo,
      decimals = excluded.decimals
  `);

    try {
        await db.run('BEGIN');
        for (const token of tokens) {
            await insert.run([
                chainId,
                token.tokenSymbol,
                token.tokenName || '',
                token.tokenContractAddress,
                token.tokenLogoUrl || '',
                token.decimals ?? null
            ]);
        }
        await db.run('COMMIT');
    } catch (err) {
        await db.run('ROLLBACK');
        throw err;
    } finally {
        await insert.finalize();
    }
}



export async function getTokenBySymbol(chainId: string, symbol: string) {
    const db = await initDb();

    const row = await db.get(
        `SELECT * FROM token WHERE chainId = ? AND symbol = ?`,
        [chainId, symbol.toUpperCase()]
    );

    if (!row) return null;

    return {
        chainId: row.chainId,
        tokenSymbol: row.symbol,
        tokenContractAddress: row.address,
        tokenName: row.name,
        tokenLogoUrl: row.logo,
        decimals: row.decimals,
    };
}