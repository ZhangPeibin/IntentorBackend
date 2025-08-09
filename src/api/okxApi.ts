import { okxClient } from "./okxDexClient";


interface PortfolioAsset {
  chainId: string;
  balance: string;
  address: string;     // token contract address
  symbol: string;
}

export async function addressAssets(chainId: string, address: string): Promise<PortfolioAsset[]> {
  try {
    const result = await okxClient.get('/api/v5/dex/balance/all-token-balances-by-address', {
      chains: chainId,
      address,
    });
    console.log('addressAssets result:', result);
    if (!result || !result.data || result.code !== '0' || result.data.length === 0) {
      
      return [];
    }
    const portfolio = result?.code === '0' ? result.data[0].tokenAssets ?? [] : [];
    const r = portfolio.map((item: any) => ({
      chainId: item.chainIndex?.toString() ?? chainId,
      balance: item.balance ?? '0',
      address: item.tokenContractAddress ?? '',
      symbol: item.symbol ?? '',
      price: item.tokenPrice 
    }))
    console.log('portfolio', r);

    return r;
  } catch (err) {
    console.error('addressAssets error:', err);
    return [];
  }
}

export async function allToken(chainId: string) {
  try {
    const result = await okxClient.get('/api/v5/dex/aggregator/all-tokens', {
      chainIndex: chainId,
    });
    return result;
  } catch (err) {
    console.error('allTokenAssets error:', err);
    return [];
  }
}

export async function quote(chainId: string, from: string, to: string, amount: string) {
  try {
    const result = await okxClient.get('/api/v5/dex/aggregator/quote', { 
      chainIndex: chainId,
      fromTokenAddress: from,
      toTokenAddress: to,
      amount,
     });
    return result;
  } catch (err) {
    console.error('quote error:', err);
    return null;
  } 
}