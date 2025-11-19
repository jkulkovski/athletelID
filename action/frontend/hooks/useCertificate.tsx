"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { AthleteCertificateABI } from "@/abi/AthleteCertificateABI";
import { AthleteCertificateAddresses } from "@/abi/AthleteCertificateAddresses";

export function useCertificate(params: { signer: ethers.Signer | null; chainId: number | null; }) {
  const { signer, chainId } = params;

  const info = useMemo(() => {
    if (!chainId) return undefined;
    const entry = AthleteCertificateAddresses[String(chainId)];
    if (!entry) return undefined;
    return { address: entry.address, abi: AthleteCertificateABI.abi } as const;
  }, [chainId]);

  const contract = useMemo(() => {
    if (!info || !signer) return undefined;
    return new ethers.Contract(info.address, info.abi, signer);
  }, [info, signer]);

  const mint = async (resultId: number, to: `0x${string}`) => {
    if (!contract) throw new Error("Certificate not ready");
    const tx = await contract.mintCertificate(resultId, to);
    return await tx.wait();
  };

  const findByResultId = async (resultId: number): Promise<number | null> => {
    if (!contract) return null;
    const tid: bigint = await contract.tokenIdByResultId(resultId);
    const n = Number(tid);
    return n === 0 ? null : n;
  };

  const listMyCertificates = async (
    owner: `0x${string}`,
    sinceBlocks: number = 300_000
  ): Promise<Array<{ tokenId: number; resultId: number; txHash: string; blockNumber: number }>> => {
    if (!contract) return [];
    const prov = contract.runner?.provider as ethers.Provider;
    const latest = BigInt(await prov.getBlockNumber());
    const window = 50_000n;
    const from = latest > BigInt(sinceBlocks) ? latest - BigInt(sinceBlocks) : 0n;
    const cmFilter = contract.filters.CertificateMinted(null, null, owner);
    const transferFilter = contract.filters.Transfer(null, owner);

    const out: Array<{ tokenId: number; resultId: number; txHash: string; blockNumber: number }> = [];
    const seen = new Set<string>();
    let start = latest;
    while (start > from) {
      const end = start;
      const begin = start > window ? start - window + 1n : 0n;
      const cmLogs = await contract.queryFilter(cmFilter, begin, end);
      for (const l of cmLogs) {
        out.push({
          tokenId: Number((l as any).args?.tokenId ?? 0),
          resultId: Number((l as any).args?.resultId ?? 0),
          txHash: (l as any).transactionHash as string,
          blockNumber: Number((l as any).blockNumber ?? 0)
        });
      }
      // Fallback: use Transfer events (mint emits Transfer(0x0 -> owner))
      const tLogs = await contract.queryFilter(transferFilter, begin, end);
      for (const l of tLogs) {
        const tokenId = Number((l as any).args?.tokenId ?? 0);
        const key = `${tokenId}:${(l as any).transactionHash}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // resultId may be unknown; try to reverse lookup
        let resultId = 0;
        try {
          const rid = await contract.tokenIdByResultId.staticCall?.(tokenId as any);
          // the mapping is resultId -> tokenId, cannot reverse without scanning;
          // keep 0 when unknown
          void rid;
        } catch {}
        out.push({
          tokenId,
          resultId,
          txHash: (l as any).transactionHash as string,
          blockNumber: Number((l as any).blockNumber ?? 0)
        });
      }
      if (begin === 0n) break;
      start = begin - 1n;
    }
    out.sort((a, b) => b.blockNumber - a.blockNumber);
    return out;
  };

  return { address: info?.address, mint, listMyCertificates, findByResultId };
}


