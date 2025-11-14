// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title AthleteID — 体育比赛成绩认证（FHE 版）
/// @notice 采用 FHE 将成绩（time/rank 等）以密文形态上链，CID 存储在链上用于验证
contract AthleteID is ZamaEthereumConfig {
    enum ResultStatus { Pending, Certified, Disputed, Rejected }

    struct EventInfo {
        uint256 eventId;
        address organizer;
        string eventCID; // IPFS metadata
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint8 threshold; // 裁判确认阈值 N
    }

    struct ResultData {
        uint256 resultId;
        uint256 eventId;
        string competitorId; // 可为证件号或别名
        address competitorWallet; // 用于解密授权
        address submitter;
        string resultCID; // IPFS: 包含成绩值/排名/媒体等原始数据
        ResultStatus status;
        uint256 timestamp;
        uint8 confirmCount; // 已确认（approve）数
        // FHE 密文字段
        euint64 encTime; // 比赛用时（或数值）
        euint32 encRank; // 排名
    }

    struct ResultView {
        uint256 resultId;
        uint256 eventId;
        string competitorId;
        address competitorWallet;
        address submitter;
        string resultCID;
        ResultStatus status;
        uint256 timestamp;
        uint8 confirmCount;
        euint64 encTime;
        euint32 encRank;
    }

    uint256 public nextEventId = 1;
    uint256 public nextResultId = 1;

    mapping(uint256 => EventInfo) public eventsById;
    mapping(uint256 => mapping(address => bool)) public isRefereeForEvent; // eventId => referee => allowed
    mapping(uint256 => uint256) public refereeCountForEvent;

    mapping(uint256 => ResultData) public resultsById;
    mapping(uint256 => mapping(address => bool)) public hasSigned; // resultId => referee => signed
    mapping(uint256 => string[]) public resultEvidence; // 记录裁判提交的 evidenceCID（顺序累积）

    mapping(uint256 => uint256[]) public resultIdsByEvent; // eventId => resultIds[]
    mapping(bytes32 => uint256[]) public resultIdsByCompetitorHash; // keccak256(competitorId) => ids

    // ------------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------------
    event EventCreated(uint256 indexed eventId, address indexed organizer, string eventCID);
    event EventUpdated(uint256 indexed eventId, bool active, uint8 threshold);
    event RefereesAdded(uint256 indexed eventId, address[] referees);
    event ResultSubmitted(
        uint256 indexed resultId,
        uint256 indexed eventId,
        string competitorId,
        address indexed submitter,
        string resultCID
    );
    event ResultSigned(uint256 indexed resultId, address indexed signer, bool approve, string evidenceCID);
    event ResultStatusChanged(uint256 indexed resultId, uint8 oldStatus, uint8 newStatus);
    event ResultDisputed(uint256 indexed resultId, address indexed challenger, string disputeCID);

    // ------------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------------
    modifier onlyEventOrganizer(uint256 eventId) {
        require(eventsById[eventId].organizer == msg.sender, "Not organizer");
        _;
    }

    modifier onlyActiveEvent(uint256 eventId) {
        require(eventsById[eventId].active, "Event inactive");
        _;
    }

    // ------------------------------------------------------------------------
    // Event management
    // ------------------------------------------------------------------------
    function createEvent(
        string calldata eventCID,
        uint256 startTime,
        uint256 endTime,
        uint8 threshold,
        address[] calldata referees
    ) external returns (uint256 eventId) {
        require(startTime < endTime, "Invalid time range");
        require(threshold > 0, "Invalid threshold");
        require(referees.length >= threshold, "Threshold > referees");

        eventId = nextEventId++;
        EventInfo storage e = eventsById[eventId];
        e.eventId = eventId;
        e.organizer = msg.sender;
        e.eventCID = eventCID;
        e.startTime = startTime;
        e.endTime = endTime;
        e.active = true;
        e.threshold = threshold;

        uint256 added;
        for (uint256 i = 0; i < referees.length; i++) {
            address r = referees[i];
            if (r != address(0) && !isRefereeForEvent[eventId][r]) {
                isRefereeForEvent[eventId][r] = true;
                added++;
            }
        }
        refereeCountForEvent[eventId] = added;

        emit EventCreated(eventId, msg.sender, eventCID);
        emit RefereesAdded(eventId, referees);
    }

    function setEventActive(uint256 eventId, bool active) external onlyEventOrganizer(eventId) {
        eventsById[eventId].active = active;
        emit EventUpdated(eventId, active, eventsById[eventId].threshold);
    }

    function setEventThreshold(uint256 eventId, uint8 threshold) external onlyEventOrganizer(eventId) {
        require(threshold > 0, "Invalid threshold");
        require(refereeCountForEvent[eventId] >= threshold, "Threshold > referees");
        eventsById[eventId].threshold = threshold;
        emit EventUpdated(eventId, eventsById[eventId].active, threshold);
    }

    function addReferees(uint256 eventId, address[] calldata referees) external onlyEventOrganizer(eventId) {
        uint256 added;
        for (uint256 i = 0; i < referees.length; i++) {
            address r = referees[i];
            if (r != address(0) && !isRefereeForEvent[eventId][r]) {
                isRefereeForEvent[eventId][r] = true;
                added++;
            }
        }
        refereeCountForEvent[eventId] += added;
        emit RefereesAdded(eventId, referees);
    }

    // ------------------------------------------------------------------------
    // Results — encrypted inputs (FHE)
    // ------------------------------------------------------------------------
    function submitResult(
        uint256 eventId,
        string calldata competitorId,
        address competitorWallet,
        externalEuint64 encTimeExt,
        bytes calldata proofTime,
        externalEuint32 encRankExt,
        bytes calldata proofRank,
        string calldata resultCID
    ) external onlyActiveEvent(eventId) returns (uint256 resultId) {
        require(eventsById[eventId].startTime <= block.timestamp, "Event not started");
        require(block.timestamp <= eventsById[eventId].endTime, "Event ended");

        euint64 ctTime = FHE.fromExternal(encTimeExt, proofTime);
        euint32 ctRank = FHE.fromExternal(encRankExt, proofRank);

        resultId = nextResultId++;
        ResultData storage r = resultsById[resultId];
        r.resultId = resultId;
        r.eventId = eventId;
        r.competitorId = competitorId;
        r.competitorWallet = competitorWallet;
        r.submitter = msg.sender;
        r.resultCID = resultCID;
        r.status = ResultStatus.Pending;
        r.timestamp = block.timestamp;
        r.confirmCount = 0;
        r.encTime = ctTime;
        r.encRank = ctRank;

        // ACL: 合约自身 + 提交者 + 选手钱包 + 组织者
        address organizer = eventsById[eventId].organizer;
        FHE.allowThis(r.encTime);
        FHE.allowThis(r.encRank);
        FHE.allow(r.encTime, msg.sender);
        FHE.allow(r.encRank, msg.sender);
        if (competitorWallet != address(0)) {
            FHE.allow(r.encTime, competitorWallet);
            FHE.allow(r.encRank, competitorWallet);
        }
        if (organizer != address(0)) {
            FHE.allow(r.encTime, organizer);
            FHE.allow(r.encRank, organizer);
        }

        resultIdsByEvent[eventId].push(resultId);
        bytes32 key = keccak256(bytes(competitorId));
        resultIdsByCompetitorHash[key].push(resultId);

        emit ResultSubmitted(resultId, eventId, competitorId, msg.sender, resultCID);
    }

    function signResult(uint256 resultId, bool approve, string calldata evidenceCID) external {
        ResultData storage r = resultsById[resultId];
        require(r.resultId != 0, "Result not found");
        require(eventsById[r.eventId].active, "Event inactive");
        require(isRefereeForEvent[r.eventId][msg.sender], "Not referee");
        require(!hasSigned[resultId][msg.sender], "Already signed");

        hasSigned[resultId][msg.sender] = true;
        if (bytes(evidenceCID).length > 0) {
            resultEvidence[resultId].push(evidenceCID);
        }
        emit ResultSigned(resultId, msg.sender, approve, evidenceCID);

        if (approve) {
            uint8 old = r.confirmCount;
            r.confirmCount = old + 1;

            // 达阈值自动认证
            if (r.status == ResultStatus.Pending) {
                uint8 threshold = eventsById[r.eventId].threshold;
                if (r.confirmCount >= threshold) {
                    _setStatus(resultId, ResultStatus.Certified);
                }
            }
        }
    }

    function disputeResult(uint256 resultId, string calldata disputeCID) external {
        ResultData storage r = resultsById[resultId];
        require(r.resultId != 0, "Result not found");
        require(msg.sender == r.competitorWallet || msg.sender == eventsById[r.eventId].organizer, "Not allowed");

        emit ResultDisputed(resultId, msg.sender, disputeCID);
        _setStatus(resultId, ResultStatus.Disputed);
    }

    function resolveDispute(uint256 resultId, bool uphold, string calldata /*resolutionCID*/ ) external onlyEventOrganizer(resultsById[resultId].eventId) {
        require(resultsById[resultId].resultId != 0, "Result not found");
        if (uphold) {
            _setStatus(resultId, ResultStatus.Certified);
        } else {
            _setStatus(resultId, ResultStatus.Rejected);
        }
    }

    function _setStatus(uint256 resultId, ResultStatus newStatus) internal {
        ResultData storage r = resultsById[resultId];
        uint8 oldStatus = uint8(r.status);
        r.status = newStatus;
        emit ResultStatusChanged(resultId, oldStatus, uint8(newStatus));
    }

    // ------------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------------
    function getResult(uint256 resultId) external view returns (ResultView memory out) {
        ResultData storage r = resultsById[resultId];
        require(r.resultId != 0, "Result not found");
        out = ResultView({
            resultId: r.resultId,
            eventId: r.eventId,
            competitorId: r.competitorId,
            competitorWallet: r.competitorWallet,
            submitter: r.submitter,
            resultCID: r.resultCID,
            status: r.status,
            timestamp: r.timestamp,
            confirmCount: r.confirmCount,
            encTime: r.encTime,
            encRank: r.encRank
        });
    }

    function getResultsByEvent(uint256 eventId, uint256 start, uint256 count) external view returns (ResultView[] memory arr) {
        uint256[] storage ids = resultIdsByEvent[eventId];
        if (start >= ids.length) return new ResultView[](0);
        uint256 end = start + count;
        if (end > ids.length) end = ids.length;
        uint256 n = end - start;
        arr = new ResultView[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = ids[start + i];
            ResultData storage r = resultsById[id];
            arr[i] = ResultView({
                resultId: r.resultId,
                eventId: r.eventId,
                competitorId: r.competitorId,
                competitorWallet: r.competitorWallet,
                submitter: r.submitter,
                resultCID: r.resultCID,
                status: r.status,
                timestamp: r.timestamp,
                confirmCount: r.confirmCount,
                encTime: r.encTime,
                encRank: r.encRank
            });
        }
    }

    function getResultsByCompetitor(string calldata competitorId) external view returns (uint256[] memory ids) {
        bytes32 key = keccak256(bytes(competitorId));
        ids = resultIdsByCompetitorHash[key];
    }

    function getConfirmCount(uint256 resultId) external view returns (uint8) {
        return resultsById[resultId].confirmCount;
    }
}


