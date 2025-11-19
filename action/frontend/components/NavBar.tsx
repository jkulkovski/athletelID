"use client";

import Link from "next/link";
import { useWallet } from "@/providers/WalletProvider";

export function NavBar() {
  const { isConnected, address, chainId, connect } = useWallet();

  const short = (a: string) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");
  const chainName = (id: number | null) =>
    id === 11155111 ? "Sepolia" : id === 1 ? "Mainnet" : id ? `Chain ${id}` : "Unknown";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(11,18,32,0.6)] backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sportBlue to-purple-500 flex items-center justify-center text-white">🏆</div>
          <div className="font-semibold">AthleteID</div>
          <span className="ml-2 text-xs text-white/50">体育比赛成绩认证平台</span>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-3 text-sm">
            <Link href="/" className="text-white/70 hover:text-white">首页</Link>
            <Link href="/events" className="text-white/70 hover:text-white">赛事</Link>
            <Link href="/events/new" className="text-white/70 hover:text-white">创建赛事</Link>
            <Link href="/certificates" className="text-white/70 hover:text-white">铸造证书</Link>
          </nav>
          {isConnected && (
            <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
              {chainName(chainId)}
            </span>
          )}

          {isConnected ? (
            <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white/80">
              {short(address)}
            </button>
          ) : (
            <button onClick={connect} className="btn-primary">连接钱包</button>
          )}
        </div>
      </div>
    </header>
  );
}


