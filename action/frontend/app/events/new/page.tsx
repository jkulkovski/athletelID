"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { ethers } from "ethers";
import Link from "next/link";

export default function NewEventPage() {
  const { signer, chainId } = useWallet();

  const [eventCID, setEventCID] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [referees, setReferees] = useState("");

  const submit = async () => {
    if (!signer) return alert("请先连接钱包");
    try {
      const toUnix = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : 0);
      const startTs = startLocal ? toUnix(startLocal) : Number(start || "0");
      const endTs = endLocal ? toUnix(endLocal) : Number(end || "0");
      const c = new ethers.Contract(
        (await import("@/abi/AthleteIDAddresses")).AthleteIDAddresses[String(chainId!)].address,
        (await import("@/abi/AthleteIDABI")).AthleteIDABI.abi,
        signer as any
      );
      const list = referees.split(",").map((s) => s.trim()).filter(Boolean);
      const tx = await c.createEvent(eventCID, BigInt(startTs), BigInt(endTs), threshold, list);
      await tx.wait();
      alert("✅ 赛事创建成功！");
    } catch (e: any) {
      alert("❌ 创建失败: " + (e?.message || e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">创建体育赛事</h2>
        <Link href="/events" className="btn-outline">返回列表</Link>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <label className="input-label">赛事元数据 CID</label>
            <input className="input" placeholder="ipfs://Qm..." value={eventCID} onChange={(e) => setEventCID(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">裁判确认阈值</label>
            <input className="input" type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || "0"))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="input-group">
            <label className="input-label">开始时间</label>
            <input className="input" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            <input className="input" type="number" placeholder="或 Unix 时间戳" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">结束时间</label>
            <input className="input" type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
            <input className="input" type="number" placeholder="或 Unix 时间戳" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">裁判地址列表 (逗号分隔)</label>
          <input className="input" placeholder="0xABC...,0xDEF..." value={referees} onChange={(e) => setReferees(e.target.value)} />
        </div>

        <button className="btn-primary w-full" onClick={submit}>🚀 提交创建赛事</button>
      </div>
    </div>
  );
}


