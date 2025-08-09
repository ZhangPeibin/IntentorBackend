// src/middlewares/globalParamChecker.ts
import { Request, Response, NextFunction } from 'express';
import { supportChain } from '../config/chain';
import { errorResponse, Errors } from '../utils/response';

export function globalParamChecker(req: Request, res: Response, next: NextFunction) {
    let address: string | undefined;
    let chainId: string | undefined;
    if (req.method === 'GET') {
        address = req.query.address as string;
        chainId = req.query.chainId as string;
    } else if (req.method === 'POST') {
        address = req.body.address as string;
        chainId = req.body.chainId as string;
    }

    if (!address) {
        return errorResponse(res, 200, Errors.missingParam('address'));
    }

    if (!chainId) {
        return errorResponse(res, 200, Errors.missingParam('chainId'));
    }

    if (!supportChain.includes(Number.parseInt(chainId))) {
        return errorResponse(res, 200, Errors.unsupportedChain(chainId));
    }

    next();
}
