//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

import "hardhat/console.sol";

contract ArtistStaking is AccessControl {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public onft;

    uint256 public stakingCapPerArtist;
    // staker => artist => onftAmountMantissa
    mapping(address => mapping(address => uint256)) public stakerInfo;
    // staker => total onft staked
    mapping(address => uint256) public totalStakedMantissa;

    mapping(address => bool) public isAccountUpgraded;

    event AccountUpgraded(address user);
    event Staked(address artist, address staker, uint256 onftAmountMantissa);
    event Unstaked(address artist, address staker, uint256 onftAmountMantissa);
    event ChangedStakingCapPerArtist(uint256 stakingCapPerArtist);

    constructor(
        address _admin,
        address _onft,
        uint256 _stakingCapPerArtist
    ) {
        _setupRole(ADMIN_ROLE, _admin);
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);

        onft = IERC20(_onft);
        stakingCapPerArtist = _stakingCapPerArtist;
    }

    function upgradeAccount() external {
        require(
            isAccountUpgraded[msg.sender] == false,
            "User account is already upgraded"
        );

        onft.transferFrom(msg.sender, address(this), 1 ether);
        isAccountUpgraded[msg.sender] = true;

        emit AccountUpgraded(msg.sender);
    }

    function stakeIntoArtist(address artist, uint256 _onftAmountMantissa)
        external
    {
        require(
            isAccountUpgraded[msg.sender] == true,
            "User account is not upgraded"
        );
        require(
            _onftAmountMantissa <= stakingCapPerArtist,
            "Staking more than the cap allows"
        );
        onft.transferFrom(msg.sender, address(this), _onftAmountMantissa);

        stakerInfo[msg.sender][artist] += _onftAmountMantissa;
        totalStakedMantissa[msg.sender] += _onftAmountMantissa;

        emit Staked(artist, msg.sender, _onftAmountMantissa);
    }

    function unstakeFromArtist(address artist, uint256 _onftAmountMantissa)
        external
    {
        require(
            _onftAmountMantissa <= stakerInfo[msg.sender][artist],
            "Insufficient ONFT staked"
        );

        onft.transfer(msg.sender, _onftAmountMantissa);

        stakerInfo[msg.sender][artist] -= _onftAmountMantissa;
        totalStakedMantissa[msg.sender] -= _onftAmountMantissa;

        emit Unstaked(artist, msg.sender, _onftAmountMantissa);
    }

    function setStakingCapPerArtist(uint256 _stakingCapPerArtist)
        external
    {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");

        stakingCapPerArtist = _stakingCapPerArtist;

        emit ChangedStakingCapPerArtist(_stakingCapPerArtist);
    }

    function recoverByHash(bytes32 hash, bytes memory signature)
        external
        pure
        returns (address)
    {
        return ECDSA.recover(hash, signature);
    }

    function recoverBySig(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external pure returns (address) {
        return ECDSA.recover(hash, v, r, s);
    }

    function toEthSignedMessageHash(bytes32 hash)
        external
        pure
        returns (bytes32)
    {
        return ECDSA.toEthSignedMessageHash(hash);
    }
}
