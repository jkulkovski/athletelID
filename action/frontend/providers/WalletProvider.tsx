"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

type WalletContextType = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  address: string;
  chainId: number | null;
  eip1193: any | null;
  isConnected: boolean;
  connect: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
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
    if (!eth) return;
    setEip1193(eth);
    eth.on?.("accountsChanged", () => connect());
    eth.on?.("chainChanged", () => connect());
    (async () => {
      try {
        const p = new ethers.BrowserProvider(eth);
        setProvider(p);
        const n = await p.getNetwork();
        setChainId(Number(n.chainId));
        const accounts: string[] = await eth.request?.({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          const s = await p.getSigner();
          setSigner(s);
          setAddress(accounts[0]);
        }
      } catch {}
    })();
  }, [connect]);

  const value: WalletContextType = {
    provider,
    signer,
    address,
    chainId,
    eip1193,
    isConnected,
    connect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}


