"use client";

import { useState } from "react";
import { pinFileToIPFS } from "@/lib/ipfs";

export function MediaUploader(props: { label?: string; onCID: (cid: string) => void; }) {
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT as string | undefined;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!jwt) {
      setError("缺少 NEXT_PUBLIC_PINATA_JWT 环境变量");
      return;
    }
    setLoading(true);
    try {
      const c = await pinFileToIPFS(file, jwt);
      setCid(c);
      props.onCID(c);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/20 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">📁</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            {props.label || "上传文件到 IPFS (Pinata)"}
          </div>
          {!jwt && (
            <div className="text-xs text-yellow-400 mt-1">
              ⚠️ 未配置 PINATA_JWT，请在 .env.local 中设置
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <input 
          type="file" 
          className="w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer cursor-pointer" 
          onChange={onFile}
          disabled={loading || !jwt}
        />
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>上传中...</span>
        </div>
      )}

      {cid && (
        <div className="mt-3 bg-green-500/20 border border-green-400/30 rounded-lg p-3">
          <div className="text-xs text-green-300 mb-1 flex items-center gap-2">
            <span>✓</span>
            <span>上传成功</span>
          </div>
          <div className="text-xs font-mono text-white/80 truncate">{cid}</div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-lg p-3">
          <div className="text-xs text-red-300 flex items-center gap-2">
            <span>✗</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
