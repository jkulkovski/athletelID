"use client";

import { useMetaMask } from "@/hooks/useMetaMask";

export function WalletConnect() {
  const { isConnected, address, chainId, connect } = useMetaMask();

  const getChainName = (id: number | null) => {
    if (!id) return "未知网络";
    switch (id) {
      case 1: return "Ethereum 主网";
      case 11155111: return "Sepolia 测试网";
      case 31337: return "本地开发网";
      default: return `Chain ${id}`;
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="card p-4 hover:scale-[1.02] transition-transform cursor-pointer" onClick={connect}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30">
            🦊
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white mb-1">连接钱包</div>
            <div className="text-xs text-white/50">点击连接 MetaMask</div>
          </div>
          <button className="btn-primary">
            连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-success p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl shadow-lg shadow-green-500/30 relative">
          🦊
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white/20 animate-pulse"></span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">{formatAddress(address)}</span>
            <button
              onClick={() => navigator.clipboard.writeText(address)}
              className="text-xs text-white/50 hover:text-white/80 transition-colors"
              title="复制完整地址"
            >
              📋
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>{getChainName(chainId)}</span>
          </div>
        </div>
        <div className="badge-ready">
          已连接
        </div>
      </div>
    </div>
  );
}
