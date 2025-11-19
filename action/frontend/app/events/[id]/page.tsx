"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/providers/WalletProvider";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAthleteID } from "@/hooks/useAthleteID";

type UIEvent = {
  eventId: number;
  active: boolean;
  organizer: string;
  eventCID: string;
  startTime: number;
  endTime: number;
  threshold: number;
};

type UIResult = {
  resultId: number;
  competitorId: string;
  competitorWallet: string;
  submitter: string;
  status: number;
  confirmCount: number;
  timestamp: number;
};

export default function EventDetailPage() {
  const params = useParams();
  const eventId = useMemo(() => Number(params?.id || 0), [params]);

  const { provider, chainId, signer, eip1193 } = useWallet();
  const raw = eip1193 || (provider as any)?._provider || (provider as any)?.provider || undefined;
  const { instance } = useFhevm({ provider: raw, chainId: chainId ?? undefined });
  const athlete = useAthleteID({ instance, signer: signer as any, chainId: chainId ?? null });

  const [ev, setEv] = useState<UIEvent | null>(null);
  const [results, setResults] = useState<UIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dec, setDec] = useState<Record<number, { time: string; rank: string }>>({});
  const [decState, setDecState] = useState<Record<number, "idle" | "loading" | "done" | "error">>({});

  // Submit form state
  const [competitorId, setCompetitorId] = useState("");
  const [competitorWallet, setCompetitorWallet] = useState("");
  const [timeValue, setTimeValue] = useState("0");
  const [rankValue, setRankValue] = useState("0");
  const [resultCID, setResultCID] = useState("");

  const refresh = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const e = await athlete.getEventById(eventId);
      if (e) {
        setEv({
          eventId: Number(e.eventId),
          active: Boolean(e.active),
          organizer: e.organizer,
          eventCID: e.eventCID,
          startTime: Number(e.startTime),
          endTime: Number(e.endTime),
          threshold: Number(e.threshold)
        });
      }
      const list = await athlete.getResultsByEvent(eventId, 0, 100);
      setResults(list.map((r: any) => ({
        resultId: Number(r.resultId),
        competitorId: r.competitorId as string,
        competitorWallet: r.competitorWallet as string,
        submitter: r.submitter as string,
        status: Number(r.status),
        confirmCount: Number(r.confirmCount),
        timestamp: Number(r.timestamp)
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [eventId]);

  const onSubmit = async () => {
    if (!instance || !signer) return;
    try {
      await athlete.submitEncrypted({
        eventId,
        competitorId,
        competitorWallet: competitorWallet as `0x${string}`,
        timeValue: BigInt(timeValue || "0"),
        rankValue: Number(rankValue || "0"),
        resultCID
      });
      alert("✅ 成绩提交成功！");
      await refresh();
    } catch (e: any) {
      alert("❌ 提交失败: " + (e?.message || e));
    }
  };

  const onSign = async (resultId: number, approve: boolean) => {
    try {
      await athlete.signResult(resultId, approve, "");
      await refresh();
    } catch (e: any) {
      alert("❌ 操作失败: " + (e?.message || e));
    }
  };

  const onDecrypt = async (resultId: number) => {
    try {
      setDecState((s) => ({ ...s, [resultId]: "loading" }));
      const r = await athlete.getAndDecryptResult(resultId);
      if (r?.clear) {
        const t = typeof r.clear.time === "bigint" ? String(r.clear.time) : String(r.clear.time ?? "");
        const rk = typeof r.clear.rank === "bigint" ? String(r.clear.rank) : String(r.clear.rank ?? "");
        setDec((prev) => ({ ...prev, [resultId]: { time: t, rank: rk } }));
        setDecState((s) => ({ ...s, [resultId]: "done" }));
      } else {
        setDecState((s) => ({ ...s, [resultId]: "error" }));
        alert("⚠️ 无法解密或记录不存在");
      }
    } catch (e: any) {
      setDecState((s) => ({ ...s, [resultId]: "error" }));
      alert("❌ 解密失败: " + (e?.message || e));
    }
  };

  const statusText = (s: number) =>
    s === 0 ? "待确认" : s === 1 ? "已认证" : s === 2 ? "争议中" : s === 3 ? "已拒绝" : String(s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-white">赛事详情 #{eventId}</div>
        <Link href="/events" className="btn-outline">返回列表</Link>
      </div>

      {ev && (
        <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-white/50">组织者</div>
            <div className="text-sm text-white/80 truncate">{ev.organizer}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">阈值</div>
            <div className="text-sm text-white/80">{ev.threshold}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">状态</div>
            <div>{ev.active ? <span className="badge-ready">进行中</span> : <span className="badge-idle">未激活</span>}</div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs text-white/50">CID</div>
            <div className="text-xs text-white/70 truncate">{ev.eventCID || '-'}</div>
          </div>
        </div>
      )}

      {/* 提交成绩 */}
      <div className="card p-6 space-y-4">
        <div className="section-title">提交成绩</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="input-group">
            <label className="input-label">选手 ID</label>
            <input className="input" value={competitorId} onChange={(e) => setCompetitorId(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">选手钱包</label>
            <input className="input" value={competitorWallet} onChange={(e) => setCompetitorWallet(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">成绩用时</label>
            <input className="input" type="number" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">排名</label>
            <input className="input" type="number" value={rankValue} onChange={(e) => setRankValue(e.target.value)} />
          </div>
          <div className="md:col-span-2 input-group">
            <label className="input-label">结果 CID</label>
            <input className="input" value={resultCID} onChange={(e) => setResultCID(e.target.value)} />
          </div>
        </div>
        <button className="btn-secondary" onClick={onSubmit}>🔐 加密提交成绩</button>
      </div>

      {/* 成绩列表 */}
      <div className="card p-6 space-y-4">
        <div className="section-title">成绩记录</div>
        {loading && <div className="text-white/70">加载中...</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="py-2">ID</th>
                <th>选手</th>
                <th>提交者</th>
                <th>确认数</th>
                <th>状态</th>
                <th>用时(解密)</th>
                <th>排名(解密)</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.resultId} className="border-t border-white/10">
                  <td className="py-2">{r.resultId}</td>
                  <td className="truncate max-w-[220px]">{r.competitorId}</td>
                  <td className="truncate max-w-[220px]">{r.submitter}</td>
                  <td>{r.confirmCount}</td>
                  <td>{statusText(r.status)}</td>
                  <td>{dec[r.resultId]?.time ?? "密文"}</td>
                  <td>{dec[r.resultId]?.rank ?? "密文"}</td>
                  <td className="text-right space-x-2">
                    <button className="btn-success" onClick={() => onSign(r.resultId, true)}>确认</button>
                    <button className="btn-outline" onClick={() => onSign(r.resultId, false)}>拒绝</button>
                    {decState[r.resultId] === "loading" && (
                      <button className="btn-primary" disabled>解密中…</button>
                    )}
                    {(!decState[r.resultId] || decState[r.resultId] === "idle") && (
                      <button className="btn-primary" onClick={() => onDecrypt(r.resultId)}>解密</button>
                    )}
                    {decState[r.resultId] === "done" && (
                      <button className="btn-primary" disabled>已解密</button>
                    )}
                    {decState[r.resultId] === "error" && (
                      <button className="btn-primary" onClick={() => onDecrypt(r.resultId)}>重试解密</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && results.length === 0 && (
          <div className="text-white/60">暂无成绩记录。</div>
        )}
      </div>
    </div>
  );
}


