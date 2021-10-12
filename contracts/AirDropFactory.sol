// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.2;

import "@openzeppelin/contracts/proxy/Clones.sol";

interface AirDrop {
    function initialize(
        address _owner,
        address _tokenContract,
        bytes32 _merkleRoot,
        bool _cancelable
    ) external;
}

contract AirDropFactory {
    event AirdropDeployed(address addr);

    function createAirdrop(
        address _implementation,
        address _owner,
        address _tokenContract,
        bytes32 _merkleRoot,
        bool _cancelable
    ) external returns (address clone) {
        clone = Clones.clone(_implementation);
        AirDrop(clone).initialize(
            _owner,
            _tokenContract,
            _merkleRoot,
            _cancelable
        );
        emit AirdropDeployed(clone);
    }
}
