//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./openzeppelinModified/ERC20PresetMinterPauser.sol";

contract ONFT is ERC20PresetMinterPauser {
    using SafeMath for uint256;

    uint256 public nextMintStartTime;
    uint256 public nextYearStartTime;
    uint256 public totalSupplyThisYear;
    uint256 public weeklyInflationAmt;
    uint256 public inflationBasisPoint;
    uint256 public mintLockPeriodSecs;
    uint256 public inflationLockPeriodSecs;

    uint256 public tempNextMintStartTime;
    uint256 public tempInflationWeeklyMintAmt;
    uint256 public tempInflationSupplyMinted;
    uint256 public tempInflationMintCount;
    uint256 public tempInflationMaxMint;

    /**
     * @dev Distributes tokens to inital holders,
     * locks the mint function for a specified time period,
     * locks the inflation function for a specified time period,
     * sets the total supply at the beggining of the period,
     * sets the weekly inflation amount of the period,
     * sets inflation basis point numerator,
     * sets the mint lock period in secs,
     * sets the temporary inflation max mint amount.
     *
     * Parameters:
     *
     * - _admin: the ONFT contract admin.
     * - _initialHolders: the initial holders of the ONFT token.
     * - _prmintedAmounts: the token amount mantissas that _initialHolders will receive on deployment.
     * - _inflationBasisPoint: the yearly inflation rate basis point represented as a numerator.
     * - _mintLockPeriodSecs: the amount of seconds to lock minting after each mint.
     * - _inflationLockPeriodSecs: the amount of seconds to lock inflating after each inflation.
     * - _tempInflationMaxMint: the amount of times temporary inflation mint can occur.
     *
     * Requirements:
     *
     * - _initialHolders and _initialHolders must be same length.
     */
    constructor(
        address _admin,
        address[] memory _initialHolders,
        uint256[] memory _premintedAmounts,
        uint256 _inflationBasisPoint,
        uint256 _mintLockPeriodSecs,
        uint256 _inflationLockPeriodSecs,
        uint256 _tempInflationWeeklyMintAmt,
        uint256 _tempInflationMaxMint
    ) public ERC20PresetMinterPauser("OpeNFT", "ONFT", _admin) {
        require(
            _initialHolders.length == _premintedAmounts.length,
            "StarToken: Wrong lengths of arrays"
        );
        for (uint256 i = 0; i < _initialHolders.length; i++) {
            _mint(_initialHolders[i], _premintedAmounts[i]);
        }

        nextMintStartTime = block.timestamp.add(_mintLockPeriodSecs);
        nextYearStartTime = block.timestamp.add(_inflationLockPeriodSecs);
        totalSupplyThisYear = totalSupply();
        weeklyInflationAmt = totalSupplyThisYear
            .mul(_inflationBasisPoint)
            .div(10000)
            .div(52);
        inflationBasisPoint = _inflationBasisPoint;
        mintLockPeriodSecs = _mintLockPeriodSecs;
        inflationLockPeriodSecs = _inflationLockPeriodSecs;
        tempNextMintStartTime = block.timestamp.add(_mintLockPeriodSecs);
        tempInflationWeeklyMintAmt = _tempInflationWeeklyMintAmt;
        tempInflationMaxMint = _tempInflationMaxMint;
    }

    /**
     * @dev Admin function to mint temporary weekly inflation.
     *
     * Parameters:
     *
     * - recipient: the address of the ONFT contract admin.
     *
     * Requirements:
     *
     * - caller must be admin.
     * - tempInflationMintCount < tempInflationMaxMint.
     * - block.timestamp >= tempNextMintStartTime.
     */
    function mintTemp(address recipient) public {
        require(admin == msg.sender, "Caller is not an admin");
        require(
            tempInflationMintCount < tempInflationMaxMint,
            "Temporary inflation is over"
        );
        require(
            block.timestamp >= tempNextMintStartTime,
            "Weekly temporary inflation already minted"
        );

        tempNextMintStartTime = tempNextMintStartTime.add(mintLockPeriodSecs);
        tempInflationSupplyMinted = tempInflationSupplyMinted.add(
            tempInflationWeeklyMintAmt
        );
        tempInflationMintCount = tempInflationMintCount + 1;
        _mint(recipient, tempInflationWeeklyMintAmt);
    }

    /**
     * @dev Admin function to mint permanent weekly inflation.
     *
     * Parameters:
     *
     * - recipient: the address of the ONFT contract admin.
     * - amount: token amount mantissa to mint.
     *
     * Requirements:
     *
     * - caller must be admin.
     * - block.timestamp >= nextMintStartTime.
     */
    function mint(address recipient) public {
        require(admin == msg.sender, "Caller is not an admin");
        require(
            block.timestamp >= nextMintStartTime,
            "Weekly permanent inflation already minted"
        );

        nextMintStartTime = nextMintStartTime.add(mintLockPeriodSecs);
        _mint(recipient, weeklyInflationAmt);
    }

    /**
     * @dev When imflation lock period is over, admin will call this function
     * to reset the weekly inflation minting amount to x% of total supply
     * minus temporary inflation supply minted.
     *
     * Requirements:
     *
     * - caller must be admin.
     * - block.timestamp >= nextYearStartTime.
     */
    function updateYearPeriod() public {
        require(admin == msg.sender, "Caller is not an admin");
        require(
            block.timestamp >= nextYearStartTime,
            "Year period is not over"
        );

        nextYearStartTime = nextYearStartTime.add(mintLockPeriodSecs);
        totalSupplyThisYear = totalSupply().sub(tempInflationSupplyMinted);
        weeklyInflationAmt = totalSupplyThisYear
            .mul(inflationBasisPoint)
            .div(10000)
            .div(52);
    }

    /**
     * @dev Admin function to add a address to the whitelist.
     * When transfers are paused, whitlisted address will not be affected.
     *
     * Parameters:
     *
     * - whitelistAddress: the address to add to whitelist.
     * - isWhitelisted: whitelist status to change to.
     *
     * Requirements:
     *
     * - caller must be admin.
     */
    function changeWhitelistStatus(address whitelistAddress, bool isWhitelisted)
        public
    {
        require(admin == msg.sender, "Caller is not an admin");
        super._changeWhitelistStatus(whitelistAddress, isWhitelisted);
    }
}
