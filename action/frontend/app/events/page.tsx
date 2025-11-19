"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function EventsListPage() {
  const { provider, chainId, signer, eip1193 } = useWallet();
  const raw = eip1193 || (provider as any)?._provider || (provider as any)?.provider || undefined;
  const { instance } = useFhevm({ provider: raw, chainId: chainId ?? undefined });
  const athlete = useAthleteID({ instance, signer: signer as any, chainId: chainId ?? null });

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<UIEvent[]>([]);

  useEffect(() => {
    let ignore = false;
    const go = async () => {
      if (!signer || !chainId) return;
      setLoading(true);
      try {
        const list = await athlete.listEvents();
        if (ignore) return;
        const mapped: UIEvent[] = list.map((e: any) => ({
          eventId: Number(e.eventId),
          active: Boolean(e.active),
          organizer: e.organizer as string,
          eventCID: e.eventCID as string,
          startTime: Number(e.startTime),
          endTime: Number(e.endTime),
          threshold: Number(e.threshold)
        }));
        setEvents(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    void go();
    return () => { ignore = true; };
  }, [signer, chainId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">赛事列表</h2>
        <Link href="/events/new" className="btn-primary">+ 创建赛事</Link>
      </div>

      {loading && <div className="text-white/70">加载中...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((ev) => (
          <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="card p-4 block">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">赛事 #{ev.eventId}</div>
              <span className={ev.active ? "badge-ready" : "badge-idle"}>{ev.active ? "进行中" : "未激活"}</span>
            </div>
            <div className="mt-2 text-sm text-white/70">组织者: {ev.organizer}</div>
            <div className="mt-1 text-xs text-white/50 truncate">CID: {ev.eventCID || "-"}</div>
            <div className="mt-3 text-xs text-white/60">阈值: {ev.threshold}</div>
          </Link>
        ))}
      </div>

      {!loading && events.length === 0 && (
        <div className="text-white/60">暂无赛事，点击右上角“创建赛事”。</div>
      )}
    </div>
  );
}


