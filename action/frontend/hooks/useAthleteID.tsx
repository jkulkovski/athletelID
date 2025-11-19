"use client";

import { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";
import { AthleteIDABI } from "@/abi/AthleteIDABI";
import { AthleteIDAddresses } from "@/abi/AthleteIDAddresses";
import { userDecrypt } from "@/fhevm/crypto";

export function useAthleteID(params: {
  instance: any | undefined;
  signer: ethers.Signer | null;
  chainId: number | null;
}) {
  const { instance, signer, chainId } = params;
  const [message, setMessage] = useState<string>("");
  
  type EventInfo = {
    eventId: bigint;
    organizer: string;
    eventCID: string;
    startTime: bigint;
    endTime: bigint;
    active: boolean;
    threshold: number;
  };

  type ResultView = {
    resultId: bigint;
    eventId: bigint;
    competitorId: string;
    competitorWallet: string;
    submitter: string;
    resultCID: string;
    status: number; // enum
    timestamp: bigint;
    confirmCount: number;
    encTime: string; // handle bytes32
    encRank: string; // handle bytes32
  };

  const contractInfo = useMemo(() => {
    if (!chainId) return undefined;
    const entry = AthleteIDAddresses[String(chainId)];
    if (!entry) return undefined;
    return { address: entry.address, abi: AthleteIDABI.abi } as const;
  }, [chainId]);

  const contract = useMemo(() => {
    if (!contractInfo || !signer) return undefined;
    return new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
  }, [contractInfo, signer]);

  // ---------- Views / Reads ----------
  const getNextEventId = useCallback(async (): Promise<number> => {
    if (!contract) return 0;
    const n: bigint = await contract.nextEventId();
    return Number(n);
  }, [contract]);

  const getEventById = useCallback(async (eventId: number): Promise<EventInfo | null> => {
    if (!contract) return null;
    try {
      const e = await contract.eventsById(eventId);
      return {
        eventId: e.eventId,
        organizer: e.organizer,
        eventCID: e.eventCID,
        startTime: e.startTime,
        endTime: e.endTime,
        active: e.active,
        threshold: Number(e.threshold)
      } as EventInfo;
    } catch {
      return null;
    }
  }, [contract]);

  const listEvents = useCallback(async (): Promise<EventInfo[]> => {
    const arr: EventInfo[] = [];
    const max = await getNextEventId();
    for (let id = 1; id < max; id++) {
      const ev = await getEventById(id);
      if (ev) arr.push(ev);
    }
    return arr.sort((a, b) => Number(b.eventId - a.eventId));
  }, [getNextEventId, getEventById]);

  const getResultsByEvent = useCallback(async (eventId: number, start = 0, count = 50): Promise<ResultView[]> => {
    if (!contract) return [];
    const list = await contract.getResultsByEvent(eventId, start, count);
    return (list as any[]).map((r) => ({
      resultId: r.resultId,
      eventId: r.eventId,
      competitorId: r.competitorId,
      competitorWallet: r.competitorWallet,
      submitter: r.submitter,
      resultCID: r.resultCID,
      status: Number(r.status),
      timestamp: r.timestamp,
      confirmCount: Number(r.confirmCount),
      encTime: r.encTime as string,
      encRank: r.encRank as string
    }));
  }, [contract]);

  const submitEncrypted = useCallback(async (args: {
    eventId: number;
    competitorId: string;
    competitorWallet: `0x${string}`;
    timeValue: bigint; // milliseconds or microseconds
    rankValue: number;
    resultCID: string;
  }) => {
    if (!instance || !contract || !signer) return;
    setMessage("Encrypting inputs...");

    const addr = contractInfo!.address;

    // time
    const inputTime = instance.createEncryptedInput(addr, await signer.getAddress());
    inputTime.add64(args.timeValue);
    const encTime = await inputTime.encrypt();

    // rank
    const inputRank = instance.createEncryptedInput(addr, await signer.getAddress());
    inputRank.add32(args.rankValue);
    const encRank = await inputRank.encrypt();

    setMessage("Submitting encrypted result...");

    const tx = await contract.submitResult(
      args.eventId,
      args.competitorId,
      args.competitorWallet,
      encTime.handles[0],
      encTime.inputProof,
      encRank.handles[0],
      encRank.inputProof,
      args.resultCID
    );
    setMessage("Waiting tx " + tx.hash);
    await tx.wait();
    setMessage("Submitted");
  }, [instance, contract, signer, contractInfo]);

  const signResult = useCallback(async (resultId: number, approve: boolean, evidenceCID: string) => {
    if (!contract) return;
    const tx = await contract.signResult(resultId, approve, evidenceCID);
    setMessage("Waiting tx " + tx.hash);
    await tx.wait();
    setMessage("Signed");
  }, [contract]);

  const getAndDecryptResult = useCallback(async (resultId: number) => {
    if (!contract || !instance || !signer) return null;
    const res = await contract.getResult(resultId);
    // enc fields are returned as handles (hex strings)
    const addr = contractInfo!.address as `0x${string}`;
    const handles = [res.encTime as string, res.encRank as string];
    const decoded = await userDecrypt(instance, signer, addr, handles);
    return {
      raw: res,
      clear: {
        time: decoded[handles[0]],
        rank: decoded[handles[1]]
      }
    };
  }, [contract, instance, signer, contractInfo]);

  return {
    contractAddress: contractInfo?.address,
    message,
    // writes
    submitEncrypted,
    signResult,
    // reads
    getAndDecryptResult,
    getNextEventId,
    getEventById,
    listEvents,
    getResultsByEvent
  };
}
