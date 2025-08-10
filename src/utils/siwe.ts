
import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
const scheme = 'https';
const domain = "intentor.com";
const origin = "http://207.148.8.209/api/verfiy";


export function createSiweMessage(address: string, 
        statement: string, 
        chainId: number,
        nonce:string) {
    const eip55Address = ethers.getAddress(address);
    const siweMessage = new SiweMessage({
        scheme,
        domain,
        address: eip55Address,
        statement,
        nonce:nonce,
        uri: origin,
        version: '1',
        chainId: chainId
    });
    return siweMessage.prepareMessage();
}


