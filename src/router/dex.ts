
import express from 'express';
import { quote } from '../api/okxApi';

const dexRouter = express.Router();


dexRouter.get('/quote', async (req:any, res:any) => {
  const { chainId, from, to, amount } = req.query;

  if (!chainId || !from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const result = await quote(chainId as string, from as string, to as string, amount as string);

  if (!result) {
    return res.status(500).json({ error: 'Quote failed.' });
  }

  return res.json(result);
});

export default dexRouter;