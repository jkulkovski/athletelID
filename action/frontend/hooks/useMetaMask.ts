"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

export function useMetaMask() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [eip1193, setEip1193] = useState<any | null>(null);

  const isConnected = useMemo(() => !!address, [address]);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("MetaMask not found");
      return;
    }
    const p = new ethers.BrowserProvider(eth);
    await p.send("eth_requestAccounts", []);
    const s = await p.getSigner();
    setProvider(p);
    setSigner(s);
    setAddress(await s.getAddress());
    const n = await p.getNetwork();
    setChainId(Number(n.chainId));
    setEip1193(eth);
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (eth) {
      setEip1193(eth);
      eth.on?.("accountsChanged", () => connect());
      eth.on?.("chainChanged", () => connect());

      // 初始化 provider 与链ID（无需请求账户权限）
      (async () => {
        try {
          const p = new ethers.BrowserProvider(eth);
          setProvider(p);
          const n = await p.getNetwork();
          setChainId(Number(n.chainId));
        } catch {
          // ignore
        }
      })();
    }
  }, [connect]);

  return { provider, signer, address, chainId, isConnected, connect, eip1193 };
}


