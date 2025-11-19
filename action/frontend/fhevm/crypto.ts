import { ethers } from "ethers";

export async function userDecrypt(
  instance: any,
  signer: ethers.Signer,
  contractAddress: `0x${string}`,
  handles: string[]
): Promise<Record<string, any>> {
  const { publicKey, privateKey } = instance.generateKeypair();
  const start = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const typed = instance.createEIP712(publicKey, [contractAddress], start, durationDays);
  // ethers v6: domain 作为独立参数传入，types 不应包含 EIP712Domain，否则会出现
  // "ambiguous primary types or unused types" 错误。
  const { domain, types, message } = typed;
  const ethersTypes = { ...types } as Record<string, any>;
  if ("EIP712Domain" in ethersTypes) {
    delete (ethersTypes as any).EIP712Domain;
  }

  const sig = await (signer as any).signTypedData(domain, ethersTypes, message);
  const userAddress = await signer.getAddress();

  const input = handles.map((h) => ({ handle: h, contractAddress }));
  const res = await instance.userDecrypt(
    input,
    privateKey,
    publicKey,
    sig,
    [contractAddress],
    userAddress,
    start,
    durationDays
  );
  return res as Record<string, any>;
}


