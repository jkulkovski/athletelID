"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAthleteID } from "@/hooks/useAthleteID";
import { useCertificate } from "@/hooks/useCertificate";

type UIEvent = { eventId: number; title: string };
type UIResult = {
  resultId: number;
  competitorId: string;
  competitorWallet: string;
  status: number;
};

export default function CertificateMintPage() {
  const { provider, chainId, signer, eip1193 } = useWallet();
  const raw = eip1193 || (provider as any)?._provider || (provider as any)?.provider || undefined;
  const { instance } = useFhevm({ provider: raw, chainId: chainId ?? undefined });
  const athlete = useAthleteID({ instance, signer: signer as any, chainId: chainId ?? null });
  const cert = useCertificate({ signer: signer as any, chainId: chainId ?? null });

  const [events, setEvents] = useState<UIEvent[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [results, setResults] = useState<UIResult[]>([]);
  const [resultId, setResultId] = useState<number | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [my, setMy] = useState<Array<{ tokenId: number; resultId: number; txHash: string; blockNumber: number }>>([]);
  const [viewAddr, setViewAddr] = useState<string>("");
  const [queryBusy, setQueryBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    const go = async () => {
      if (!signer || !chainId) return;
      const list = await athlete.listEvents();
      if (ignore) return;
      setEvents(list.map((e: any) => ({ eventId: Number(e.eventId), title: e.eventCID || `Event #${Number(e.eventId)}` })));
      // load my certs
      try {
        const addr = await signer.getAddress();
        setViewAddr(addr);
        const logs = await cert.listMyCertificates(addr as any);
        if (!ignore) setMy(logs.sort((a, b) => b.blockNumber - a.blockNumber));
      } catch (e) {
        // ignore
      }
    };
    void go();
    return () => { ignore = true; };
  }, [signer, chainId]);

  useEffect(() => {
    let ignore = false;
    const go = async () => {
      if (!eventId) { setResults([]); setResultId(null); return; }
      const list = await athlete.getResultsByEvent(eventId, 0, 200);
      if (ignore) return;
      setResults(list.map((r: any) => ({
        resultId: Number(r.resultId),
        competitorId: r.competitorId as string,
        competitorWallet: r.competitorWallet as string,
        status: Number(r.status)
      })));
      setResultId(null);
    };
    void go();
    return () => { ignore = true; };
  }, [eventId]);

  const statusText = (s: number) => s === 1 ? "已认证" : s === 0 ? "待确认" : s === 2 ? "争议中" : s === 3 ? "已拒绝" : String(s);
  const canMint = useMemo(() => !!resultId && !!to && results.find(r => r.resultId === resultId)?.status === 1, [resultId, to, results]);

  const doMint = async () => {
    if (!resultId || !to) return;
    try {
      setBusy(true);
      const receipt = await cert.mint(resultId, to as any);
      alert("✅ 证书铸造成功\nTx: " + receipt?.transactionHash);
      // refresh my list
      try {
        const addr = await signer!.getAddress();
        const logs = await cert.listMyCertificates(addr as any);
        setMy(logs.sort((a, b) => b.blockNumber - a.blockNumber));
      } catch {}
    } catch (e: any) {
      alert("❌ 铸造失败: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-bold text-white">铸造成绩证书 (SBT)</div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <label className="input-label">选择赛事</label>
            <select className="input" value={eventId ?? ""} onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">请选择赛事</option>
              {events.map((e) => (
                <option key={e.eventId} value={e.eventId}>{`#${e.eventId} - ${e.title}`}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">选择成绩记录</label>
            <select className="input" value={resultId ?? ""} onChange={(e) => setResultId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">请选择成绩 (仅已认证可铸造)</option>
              {results.map((r) => (
                <option key={r.resultId} value={r.resultId}>{`#${r.resultId} | ${r.competitorId} | ${statusText(r.status)}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">接收地址</label>
          <input className="input" placeholder="0x..." value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <button className="btn-secondary w-full" disabled={!canMint || busy} onClick={doMint}>
          {busy ? "铸造中…" : "铸造证书 NFT"}
        </button>
      </div>
      {/* 我的证书模块已隐藏 */}
    </div>
  );
}


