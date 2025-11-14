// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AthleteCertificate — SBT 风格证书（不可转移）
contract AthleteCertificate is ERC721, Ownable {
    error Soulbound();

    uint256 public nextTokenId = 1;
    address public minter; // AthleteID 合约地址

    // resultId -> tokenId（一个结果对应一枚证书）
    mapping(uint256 => uint256) public tokenIdByResultId;

    event CertificateMinted(uint256 indexed tokenId, uint256 indexed resultId, address indexed to);
    event MinterUpdated(address indexed minter);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}

    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterUpdated(m);
    }

    function mintCertificate(uint256 resultId, address to) external returns (uint256 tokenId) {
        require(msg.sender == owner() || msg.sender == minter, "Not minter");
        require(tokenIdByResultId[resultId] == 0, "Already minted");
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        tokenIdByResultId[resultId] = tokenId;
        emit CertificateMinted(tokenId, resultId, to);
    }

    // -------------------------- Soulbound (non-transferable) --------------------------
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        // 禁止转移，仅允许从 address(0) 铸造
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}


