/**
 * Copyright (C) 2018  Smartz, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND (express or implied).
 */

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

interface IERC20 {
    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract ERC20AirDrops {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    Counters.Counter private _airdropIds;

    struct Airdrop {
        address owner;
        bytes32 merkleRoot;
        bool cancelable;
        uint256 tokenAmount;
        // uint256 startTime;
        mapping(address => bool) collected;
    }

    // address of contract, having "transfer" function
    // airdrop contract must have ENOUGH TOKENS in its balance to perform transfer
    IERC20 tokenContract;

    event StartAirdrop(uint256 airdropId);
    event AirdropTransfer(uint256 id, address addr, uint256 num);

    mapping(uint256 => Airdrop) public airdrops;

    constructor(IERC20 _tokenContract) public {
        tokenContract = _tokenContract;
    }

    function startAirdrop(
        bytes32 _merkleRoot,
        bool _cancelable,
        uint256 _tokenAmount
    ) public {
        _airdropIds.increment();
        Airdrop storage newAirdrop = airdrops[_airdropIds.current()];
        newAirdrop.owner = msg.sender;
        newAirdrop.merkleRoot = _merkleRoot;
        newAirdrop.cancelable = _cancelable;
        newAirdrop.tokenAmount = _tokenAmount;
        // newAirdrop.startTime = block.timestamp;

        tokenContract.transferFrom(msg.sender, address(this), _tokenAmount);
        emit StartAirdrop(_airdropIds.current());
    }

    function setRoot(uint256 _id, bytes32 _merkleRoot) public {
        require(
            msg.sender == airdrops[_id].owner,
            "Only owner of an airdrop can set root"
        );
        airdrops[_id].merkleRoot = _merkleRoot;
    }

    function collected(uint256 _id, address _who) public view returns (bool) {
        return airdrops[_id].collected[_who];
    }

    function nextAirdropId() public view returns (uint256) {
        return _airdropIds.current() + 1;
    }

    function contractTokenBalance() public view returns (uint256) {
        return tokenContract.balanceOf(address(this));
    }

    function contractTokenBalanceById(uint256 _id)
        public
        view
        returns (uint256)
    {
        return airdrops[_id].tokenAmount;
    }

    function endAirdrop(uint256 _id) public returns (bool) {
        require(airdrops[_id].cancelable, "this presale is not cancelable");
        // only owner
        require(
            msg.sender == airdrops[_id].owner,
            "Only owner of an airdrop can end the airdrop"
        );
        require(airdrops[_id].tokenAmount > 0, "Airdrop has no balance left");
        // require(airdrops[_id].startTime <= block.timestamp - 43800 minutes, "Must wait 1 month before ending airdrop"); // 1 month
        uint256 transferAmount = airdrops[_id].tokenAmount;
        airdrops[_id].tokenAmount = 0;
        require(
            tokenContract.transferFrom(
                address(this),
                airdrops[_id].owner,
                transferAmount
            ),
            "Unable to transfer remaining balance"
        );
        return true;
    }

    function getTokens(
        uint256 _id,
        bytes32[] memory _proof,
        address _who,
        uint256 _amount
    ) public returns (bool success) {
        Airdrop storage airdrop = airdrops[_id];

        require(
            airdrop.collected[_who] != true,
            "User has already collected from this airdrop"
        );
        require(_amount > 0, "User must collect an amount greater than 0");
        require(
            airdrop.tokenAmount >= _amount,
            "The airdrop does not have enough balance for this withdrawal"
        );
        require(
            msg.sender == _who,
            "Only the recipient can receive for themselves"
        );

        if (
            !checkProof(_id, _proof, leafFromAddressAndNumTokens(_who, _amount))
        ) {
            // throw if proof check fails, no need to spend gas
            require(false, "Invalid proof");
            // return false;
        }

        airdrop.tokenAmount = airdrop.tokenAmount.sub(_amount);
        airdrop.collected[_who] = true;

        if (tokenContract.transferFrom(address(this), _who, _amount) == true) {
            emit AirdropTransfer(_id, _who, _amount);
            return true;
        }
        // throw if transfer fails, no need to spend gas
        require(false);
    }

    function getTokensFromMultiple(
        uint256[] memory _ids,
        bytes32[][] memory _proofs,
        address _who,
        uint256[] memory _amounts
    ) public returns (bool success) {
        require(
            _ids.length == _proofs.length && _ids.length == _amounts.length,
            "Invalid lengths"
        );
        for (uint256 i = 0; i < _ids.length; i++) {
            getTokens(_ids[i], _proofs[i], _who, _amounts[i]);
        }
    }

    function addressToAsciiString(address x)
        internal
        pure
        returns (string memory)
    {
        bytes memory s = new bytes(40);
        uint256 x_int = uint256(uint160(address(x)));

        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(x_int / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function uintToStr(uint256 i) internal pure returns (string memory) {
        if (i == 0) return "0";
        uint256 j = i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (i != 0) {
            bstr[(k--) - 1] = bytes1(uint8(48 + (i % 10)));
            i /= 10;
        }
        return string(bstr);
    }

    function leafFromAddressAndNumTokens(address _account, uint256 _amount)
        internal
        pure
        returns (bytes32)
    {
        string memory prefix = "0x";
        string memory space = " ";

        // file with addresses and tokens have this format: "0x123...DEF 999",
        // where 999 - num tokens
        // function simply calculates hash of such a string, given the target
        // address and num tokens

        bytes memory leaf = abi.encodePacked(
            prefix,
            addressToAsciiString(_account),
            space,
            uintToStr(_amount)
        );

        return bytes32(sha256(leaf));
    }

    function checkProof(
        uint256 _id,
        bytes32[] memory _proof,
        bytes32 hash
    ) internal view returns (bool) {
        bytes32 el;
        bytes32 h = hash;

        for (
            uint256 i = 0;
            _proof.length != 0 && i <= _proof.length - 1;
            i += 1
        ) {
            el = _proof[i];

            if (h < el) {
                h = sha256(abi.encodePacked(h, el));
            } else {
                h = sha256(abi.encodePacked(el, h));
            }
        }

        return h == airdrops[_id].merkleRoot;
    }
}
