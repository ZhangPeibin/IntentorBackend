import axios, { AxiosRequestConfig, Method } from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';
import dotenv from 'dotenv';

dotenv.config();

const apiConfig = {
  apiKey: process.env.OKX_API_KEY || '',
  secretKey: process.env.OKX_SECRET_KEY || '',
  passphrase: process.env.OKX_PASSPHRASE || '',
};

function preHash(
  timestamp: string,
  method: Method,
  requestPath: string,
  params?: Record<string, any>
): string {
  let query = '';
  if (method === 'GET' && params) {
    console.log('Get Params:', params);
    query = '?' + querystring.stringify(params);
  } else if (method === 'POST' && params) {
    console.log('Post Params:', params);
    query = JSON.stringify(params);
  }
  const preHash = timestamp + method.toUpperCase() + requestPath + query;
  console.log('Pre-Hash:', preHash);
  return preHash
}

function sign(message: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function createHeaders(
  method: Method,
  requestPath: string,
  params?: Record<string, any>
): { headers: Record<string, string>; url: string } {
  const timestamp = new Date().toISOString().slice(0, -5) + 'Z';
  const message = preHash(timestamp, method, requestPath, params);
  const signature = sign(message, apiConfig.secretKey);

  const headers: Record<string, string> = {
    'OK-ACCESS-KEY': apiConfig.apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': apiConfig.passphrase,
    'Content-Type': 'application/json',
  };

  const baseURL = 'https://web3.okx.com';
  const queryStr =
    method === 'GET' && params ? '?' + querystring.stringify(params) : '';
  const url = `${baseURL}${requestPath}${queryStr}`;

  return { headers, url };
}

async function request<T = any>(
  method: Method,
  path: string,
  params?: Record<string, any>
): Promise<T> {
  const { headers, url } = createHeaders(method, path, params);

  const config: AxiosRequestConfig = {
    method,
    url,
    headers,
    data: method === 'POST' ? params : undefined,
  };
  const response = await axios.request<T>(config);
  return response.data;
}

export const okxClient = {
  get: <T = any>(path: string, params?: Record<string, any>) =>
    request<T>('GET', path, params),
  post: <T = any>(path: string, params?: Record<string, any>) =>
    request<T>('POST', path, params),
};
