"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAthleteID } from "@/hooks/useAthleteID";
import { useCertificate } from "@/hooks/useCertificate";
import { MediaUploader } from "@/components/MediaUploader";

export function Dashboard() {
  const { provider, signer, chainId, eip1193 } = useWallet();
  const raw = eip1193 || (provider as any)?._provider || (provider as any)?.provider || undefined;
  const { instance, status, error } = useFhevm({ provider: raw, chainId: chainId ?? undefined });
  const athlete = useAthleteID({ instance, signer: signer as any, chainId: chainId ?? null });
  const cert = useCertificate({ signer: signer as any, chainId: chainId ?? null });

  const [activeTab, setActiveTab] = useState<"event" | "result" | "referee" | "decrypt" | "certificate">("event");
  
  // 创建赛事表单
  const [eventCID, setEventCID] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startLocal, setStartLocal] = useState(""); // datetime-local value
  const [endLocal, setEndLocal] = useState(""); // datetime-local value
  const [threshold, setThreshold] = useState(2);
  const [referees, setReferees] = useState("");

  // 提交成绩表单
  const [eventId, setEventId] = useState<number>(1);
  const [competitorId, setCompetitorId] = useState("");
  const [competitorWallet, setCompetitorWallet] = useState("");
  const [timeValue, setTimeValue] = useState("0");
  const [rankValue, setRankValue] = useState("0");
  const [resultCID, setResultCID] = useState("");
  
  // 裁判/解密/证书
  const [resultId, setResultId] = useState("0");

  const getStatusBadge = () => {
    switch (status) {
      case "idle": return <span className="badge-idle">未连接</span>;
      case "loading": return <span className="badge-loading">加载中...</span>;
      case "ready": return <span className="badge-ready"><span className="status-dot-success"></span>已就绪</span>;
      case "error": return <span className="badge-error"><span className="status-dot-error"></span>错误</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* FHEVM 状态卡片 */}
      <div className="card-primary p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">🔐 FHEVM 加密引擎</h2>
            <p className="text-sm text-white/60">全同态加密 (FHE) 状态监控</p>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">合约地址</div>
            <div className="text-sm font-mono text-white/80 truncate">
              {athlete.contractAddress || "N/A"}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">消息状态</div>
            <div className="text-sm text-white/80">
              {status === "error" ? (error?.message || "初始化失败") : (athlete.message || "待命中")}
            </div>
          </div>
        </div>
      </div>

      {/* 功能标签页 */}
      <div className="card p-2 flex flex-wrap gap-2">
        {[
          { id: "event", label: "🏆 创建赛事", icon: "📋" },
          { id: "result", label: "📊 提交成绩", icon: "🔒" },
          { id: "referee", label: "✅ 裁判签名", icon: "✍️" },
          { id: "decrypt", label: "🔓 解密查看", icon: "👁️" },
          { id: "certificate", label: "🎖️ 铸造证书", icon: "🪙" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            <span className="hidden md:inline">{tab.label.split(" ")[1]}</span>
            <span className="md:hidden">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* 创建赛事 */}
      {activeTab === "event" && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="section-title">创建体育赛事</h3>
            <p className="section-subtitle">设置赛事基本信息、时间范围与裁判团队</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">赛事元数据 CID</label>
              <input 
                className="input" 
                placeholder="ipfs://Qm..." 
                value={eventCID} 
                onChange={e => setEventCID(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">裁判确认阈值</label>
              <input 
                className="input" 
                type="number"
                placeholder="例如: 2" 
                value={threshold} 
                onChange={e => setThreshold(Number(e.target.value || "0"))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">开始时间</label>
              <input
                className="input"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="或手动填写 Unix 时间戳，例如: 1700000000"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">结束时间</label>
              <input
                className="input"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="或手动填写 Unix 时间戳，例如: 1700086400"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">裁判地址列表 (逗号分隔)</label>
            <input 
              className="input" 
              placeholder="0xABC...,0xDEF...,0x123..." 
              value={referees} 
              onChange={e => setReferees(e.target.value)} 
            />
          </div>

          <div className="divider"></div>

          <MediaUploader label="📤 上传赛事元数据文件 (得到 eventCID)" onCID={setEventCID} />

          <button 
            className="btn-primary w-full" 
            onClick={async () => {
              if (!signer) return alert("请先连接钱包");
              try {
                const toUnix = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : 0);
                const startTs = startLocal ? toUnix(startLocal) : Number(start || "0");
                const endTs = endLocal ? toUnix(endLocal) : Number(end || "0");
                const { ethers } = await import("ethers");
                const c = new ethers.Contract(
                  athlete.contractAddress!,
                  (await import("@/abi/AthleteIDABI")).AthleteIDABI.abi,
                  signer as any
                );
                const list = referees.split(",").map(s => s.trim()).filter(Boolean);
                const tx = await c.createEvent(eventCID, BigInt(startTs), BigInt(endTs), threshold, list);
                await tx.wait();
                alert("✅ 赛事创建成功！");
              } catch (e: any) {
                alert("❌ 创建失败: " + (e?.message || e));
              }
            }}
          >
            🚀 提交创建赛事
          </button>
        </div>
      )}

      {/* 提交成绩 */}
      {activeTab === "result" && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="section-title">提交比赛成绩 (加密上链)</h3>
            <p className="section-subtitle">使用 FHE 加密选手成绩，保护隐私的同时确保数据可验证</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-300 mb-1">全同态加密 (FHE)</h4>
                <p className="text-sm text-white/70">
                  您的成绩数据将使用 ZAMA FHE 技术加密，链上存储密文，只有授权用户可解密查看
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="input-group">
              <label className="input-label">赛事 ID</label>
              <input 
                className="input" 
                type="number"
                placeholder="例如: 1" 
                value={eventId} 
                onChange={e => setEventId(Number(e.target.value || "0"))} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">选手 ID</label>
              <input 
                className="input" 
                placeholder="证件号或昵称" 
                value={competitorId} 
                onChange={e => setCompetitorId(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">选手钱包地址</label>
              <input 
                className="input" 
                placeholder="0x..." 
                value={competitorWallet} 
                onChange={e => setCompetitorWallet(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">⏱️ 比赛用时 (毫秒或微秒)</label>
              <input 
                className="input" 
                type="number"
                placeholder="例如: 125000 (125秒)" 
                value={timeValue} 
                onChange={e => setTimeValue(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">🏅 排名 (整数)</label>
              <input 
                className="input" 
                type="number"
                placeholder="例如: 1" 
                value={rankValue} 
                onChange={e => setRankValue(e.target.value)} 
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">成绩元数据 CID</label>
            <input 
              className="input" 
              placeholder="ipfs://Qm... (包含媒体/数据)" 
              value={resultCID} 
              onChange={e => setResultCID(e.target.value)} 
            />
          </div>

          <div className="divider"></div>

          <MediaUploader label="📤 上传成绩/媒体文件 (得到 resultCID)" onCID={setResultCID} />

          <button 
            className="btn-secondary w-full" 
            disabled={!instance || !signer}
            onClick={async () => {
              if (!instance || !signer) return;
              try {
                await athlete.submitEncrypted({
                  eventId,
                  competitorId,
                  competitorWallet: competitorWallet as any,
                  timeValue: BigInt(timeValue || "0"),
                  rankValue: Number(rankValue || "0"),
                  resultCID
                });
                alert("✅ 成绩提交成功！（已加密上链）");
              } catch (e: any) {
                alert("❌ 提交失败: " + (e?.message || e));
              }
            }}
          >
            🔐 加密提交成绩
          </button>
        </div>
      )}

      {/* 裁判签名 */}
      {activeTab === "referee" && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="section-title">裁判确认与签名</h3>
            <p className="section-subtitle">裁判对成绩进行审核与确认，达到阈值后自动认证</p>
          </div>

          <div className="input-group">
            <label className="input-label">成绩记录 ID</label>
            <input 
              className="input" 
              type="number"
              placeholder="输入需要审核的 resultId" 
              value={resultId} 
              onChange={e => setResultId(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              className="btn-success flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  await athlete.signResult(Number(resultId || "0"), true, "");
                  alert("✅ 确认成功");
                } catch (e: any) {
                  alert("❌ 操作失败: " + (e?.message || e));
                }
              }}
            >
              <span>✓</span>
              <span>确认通过</span>
            </button>
            
            <button 
              className="btn-outline flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  await athlete.signResult(Number(resultId || "0"), false, "");
                  alert("⚠️ 已拒绝");
                } catch (e: any) {
                  alert("❌ 操作失败: " + (e?.message || e));
                }
              }}
            >
              <span>✗</span>
              <span>拒绝</span>
            </button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 mt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-300 mb-1">裁判权限说明</h4>
                <p className="text-sm text-white/70">
                  只有被赛事组织者授权的裁判地址才能签名。达到阈值后成绩自动变为"已认证"状态。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 解密查看 */}
      {activeTab === "decrypt" && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="section-title">解密查看成绩</h3>
            <p className="section-subtitle">授权用户可解密并查看加密的成绩数据</p>
          </div>

          <div className="input-group">
            <label className="input-label">成绩记录 ID</label>
            <input 
              className="input" 
              type="number"
              placeholder="输入要解密的 resultId" 
              value={resultId} 
              onChange={e => setResultId(e.target.value)} 
            />
          </div>

          <button 
            className="btn-primary w-full"
            disabled={!instance || !signer}
            onClick={async () => {
              if (!instance || !signer) return;
              try {
                const r = await athlete.getAndDecryptResult(Number(resultId || "0"));
                if (r?.clear) {
                  alert(
                    `🔓 解密成功！\n\n` +
                    `⏱️ 用时: ${r.clear.time}\n` +
                    `🏅 排名: ${r.clear.rank}`
                  );
                } else {
                  alert("⚠️ 无法解密或记录不存在");
                }
              } catch (e: any) {
                alert("❌ 解密失败: " + (e?.message || e));
              }
            }}
          >
            🔓 用户解密
          </button>

          <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔑</span>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-300 mb-1">解密权限</h4>
                <p className="text-sm text-white/70">
                  只有授权地址（选手、提交者、组织者）才能解密查看。FHE 技术确保数据在链上始终以密文形式存储。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 铸造证书 */}
      {activeTab === "certificate" && (
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="section-title">铸造成绩证书 (SBT)</h3>
            <p className="section-subtitle">为已认证的成绩铸造不可转移的 Soulbound Token 证书</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">证书合约地址</div>
            <div className="text-sm font-mono text-white/80 truncate">
              {cert.address || "N/A"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">成绩记录 ID</label>
              <input 
                className="input" 
                type="number"
                placeholder="输入 resultId" 
                value={resultId} 
                onChange={e => setResultId(e.target.value)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">接收地址</label>
              <input 
                className="input" 
                placeholder="0x..." 
                value={competitorWallet} 
                onChange={e => setCompetitorWallet(e.target.value)} 
              />
            </div>
          </div>

          <button 
            className="btn-secondary w-full"
            onClick={async () => {
              if (!competitorWallet) return alert("请填写接收地址");
              try {
                const receipt = await cert.mint(Number(resultId || "0"), competitorWallet as any);
                alert("✅ 证书铸造成功！\nTx: " + receipt?.transactionHash);
              } catch (e: any) {
                alert("❌ 铸造失败: " + (e?.message || e));
              }
            }}
          >
            🪙 铸造证书 NFT
          </button>

          <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎖️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-green-300 mb-1">Soulbound Token (SBT)</h4>
                <p className="text-sm text-white/70">
                  证书采用 ERC-721 标准，但禁止转移（Soulbound），永久绑定到选手地址，作为成绩的链上凭证。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
