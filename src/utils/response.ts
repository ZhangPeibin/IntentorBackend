// utils/response.ts
export function errorResponse(res : any, statusCode = 400, message = 'Bad Request') {
    return res.status(statusCode).json({ ok: false, error: message });
}


export const Errors = {
    missingParam: (param: string) => `Missing ${param} parameter`,
    unsupportedChain: (chainId: string | number) => `chainId: ${chainId} is not supported.`,
    invalidAddress: 'Invalid Ethereum address',
    invalidSignature: 'Invalid signature',
    invalidNonce: 'Invalid or expired nonce.',
    signatureVerificationFailed: 'Signature verification failed.',
        
};