const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");

describe("Artist Staking", function () {
  let ArtistStaking;
  let artistStaking;
  let ONFT;
  let onft;
  let accounts;
  let userAccounts;
  let artistAccounts;
  let adminAccount;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    adminAccount = accounts[0];
    userAccounts = accounts.slice(1, 6);
    artistAccounts = accounts.slice(6, 14);

    ONFT = await ethers.getContractFactory("ONFT");
    onft = await ONFT.deploy(
      adminAccount.address,
      [userAccounts[0].address, userAccounts[1].address],
      [parseEther("2000000"), parseEther("500000")],
      "300",
      "7",
      "10",
      parseEther("3205"),
      "3"
    );
    await onft.deployed();

    ArtistStaking = await ethers.getContractFactory("ArtistStaking");
    artistStaking = await ArtistStaking.deploy(
      adminAccount.address,
      onft.address,
      parseEther("1000")
    );
    await artistStaking.deployed();

    await (
      await onft
        .connect(userAccounts[0])
        .approve(artistStaking.address, parseEther("2000000"))
    ).wait();
    await (
      await onft
        .connect(userAccounts[1])
        .approve(artistStaking.address, parseEther("500000"))
    ).wait();
  });

  // uncomment start
  it("Should init properly", async function () {
    const adminRole = await artistStaking.ADMIN_ROLE();

    expect(await artistStaking.hasRole(adminRole, adminAccount.address)).to.be
      .true;

    expect(await artistStaking.onft()).to.equal(onft.address);

    expect(await artistStaking.stakingCapPerArtist()).to.equal(
      parseEther("1000")
    );
  });

  it("Grants & revokes admin permissions", async () => {
    const adminRole = await artistStaking.ADMIN_ROLE();

    try {
      await (
        await artistStaking
          .connect(userAccounts[0])
          .grantRole(adminRole, userAccounts[1].address)
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/sender must be an admin to grant/);
    }

    await (
      await artistStaking.grantRole(adminRole, userAccounts[1].address)
    ).wait();
    expect(await artistStaking.hasRole(adminRole, userAccounts[1].address)).to
      .be.true;

    await (
      await artistStaking.revokeRole(adminRole, userAccounts[1].address)
    ).wait();

    expect(await artistStaking.hasRole(adminRole, userAccounts[1].address)).to
      .be.false;
  });

  it("Upgrade Account", async () => {
    // user0 upgrades
    let user0ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[0].address
    );
    let artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );
    expect(await artistStaking.isAccountUpgraded(userAccounts[0].address)).to.be
      .false;

    let AccountUpgradedEvent = new Promise((resolve, reject) => {
      artistStaking.once("AccountUpgraded", (staker) => {
        resolve({
          staker,
        });
      });
    });

    await (
      await artistStaking.connect(userAccounts[0]).upgradeAccount()
    ).wait();

    let accountUpgradedEventData = await AccountUpgradedEvent;
    expect(accountUpgradedEventData.staker).to.equal(userAccounts[0].address);

    expect(await artistStaking.isAccountUpgraded(userAccounts[0].address)).to.be
      .true;

    expect(await onft.balanceOf(userAccounts[0].address)).to.equal(
      user0ONFTBalanceMantissa.sub(parseEther("1"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("1"))
    );

    try {
      await (
        await artistStaking.connect(userAccounts[0]).upgradeAccount()
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/User account is already upgraded/);
    }

    // user1 upgrades
    let user1ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[1].address
    );
    artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );
    expect(await artistStaking.isAccountUpgraded(userAccounts[1].address)).to.be
      .false;

    AccountUpgradedEvent = new Promise((resolve, reject) => {
      artistStaking.once("AccountUpgraded", (staker) => {
        resolve({
          staker,
        });
      });
    });

    await (
      await artistStaking.connect(userAccounts[1]).upgradeAccount()
    ).wait();

    accountUpgradedEventData = await AccountUpgradedEvent;
    expect(accountUpgradedEventData.staker).to.equal(userAccounts[1].address);

    expect(await artistStaking.isAccountUpgraded(userAccounts[1].address)).to.be
      .true;

    expect(await onft.balanceOf(userAccounts[1].address)).to.equal(
      user1ONFTBalanceMantissa.sub(parseEther("1"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("1"))
    );

    try {
      await (
        await artistStaking.connect(userAccounts[1]).upgradeAccount()
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/User account is already upgraded/);
    }
  });

  it("Stake into artist", async () => {
    // user0 stakes into artist0
    try {
      await (
        await artistStaking
          .connect(userAccounts[0])
          .stakeIntoArtist(artistAccounts[0].address, parseEther("10"))
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/User account is not upgraded/);
    }

    expect(
      await artistStaking.stakerInfo(
        userAccounts[0].address,
        artistAccounts[0].address
      )
    ).to.equal(0);

    let StakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Staked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    await (
      await artistStaking.connect(userAccounts[0]).upgradeAccount()
    ).wait();

    let user0ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[0].address
    );
    let artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );

    // added test here for user total staked
    let user0TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[0].address
    );

    try {
      await (
        await artistStaking
          .connect(userAccounts[0])
          .stakeIntoArtist(artistAccounts[0].address, parseEther("1001"))
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/Staking more than the cap allows/);
    }

    await (
      await artistStaking
        .connect(userAccounts[0])
        .stakeIntoArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    let stakedEventData = await StakedEvent;
    expect(stakedEventData.artist).to.equal(artistAccounts[0].address);
    expect(stakedEventData.staker).to.equal(userAccounts[0].address);
    expect(stakedEventData.onftAmountMantissa).to.equal(parseEther("10"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[0].address,
        artistAccounts[0].address
      )
    ).to.equal(parseEther("10"));

    expect(await onft.balanceOf(userAccounts[0].address)).to.equal(
      user0ONFTBalanceMantissa.sub(parseEther("10"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("10"))
    );

    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[0].address)
    ).to.equal(user0TotalStakedMantissa.add(parseEther("10")));

    // user1 stakes into artist0

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[0].address
      )
    ).to.equal(0);

    StakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Staked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    await (
      await artistStaking.connect(userAccounts[1]).upgradeAccount()
    ).wait();

    let user1ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[1].address
    );
    artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );

    // added test here for user total staked
    let user1TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[1].address
    );

    await (
      await artistStaking
        .connect(userAccounts[1])
        .stakeIntoArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    stakedEventData = await StakedEvent;
    expect(stakedEventData.artist).to.equal(artistAccounts[0].address);
    expect(stakedEventData.staker).to.equal(userAccounts[1].address);
    expect(stakedEventData.onftAmountMantissa).to.equal(parseEther("10"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[0].address
      )
    ).to.equal(parseEther("10"));

    expect(await onft.balanceOf(userAccounts[1].address)).to.equal(
      user1ONFTBalanceMantissa.sub(parseEther("10"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("10"))
    );

    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[1].address)
    ).to.equal(user1TotalStakedMantissa.add(parseEther("10")));

    // user1 stakes into artist1

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[1].address
      )
    ).to.equal(0);

    StakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Staked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    user1ONFTBalanceMantissa = await onft.balanceOf(userAccounts[1].address);

    artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );

    // added test here for user total staked
    user1TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[1].address
    );

    await (
      await artistStaking
        .connect(userAccounts[1])
        .stakeIntoArtist(artistAccounts[1].address, parseEther("20"))
    ).wait();

    stakedEventData = await StakedEvent;
    expect(stakedEventData.artist).to.equal(artistAccounts[1].address);
    expect(stakedEventData.staker).to.equal(userAccounts[1].address);
    expect(stakedEventData.onftAmountMantissa).to.equal(parseEther("20"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[1].address
      )
    ).to.equal(parseEther("20"));

    expect(await onft.balanceOf(userAccounts[1].address)).to.equal(
      user1ONFTBalanceMantissa.sub(parseEther("20"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("20"))
    );

    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[1].address)
    ).to.equal(user1TotalStakedMantissa.add(parseEther("20")));
  });

  it("Unstake from artist", async () => {
    await (
      await artistStaking.connect(userAccounts[0]).upgradeAccount()
    ).wait();

    await (
      await artistStaking.connect(userAccounts[1]).upgradeAccount()
    ).wait();

    await (
      await artistStaking
        .connect(userAccounts[0])
        .stakeIntoArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    await (
      await artistStaking
        .connect(userAccounts[1])
        .stakeIntoArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    await (
      await artistStaking
        .connect(userAccounts[1])
        .stakeIntoArtist(artistAccounts[1].address, parseEther("20"))
    ).wait();

    // user0 unstakes from artist0
    let user0ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[0].address
    );
    let artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );
    // added test here for user total staked
    let user0TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[0].address
    );
    expect(user0TotalStakedMantissa).to.equal(parseEther("10"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[0].address,
        artistAccounts[0].address
      )
    ).to.equal(parseEther("10"));

    let UnstakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Unstaked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    await (
      await artistStaking
        .connect(userAccounts[0])
        .unstakeFromArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    let unstakedEventData = await UnstakedEvent;
    expect(unstakedEventData.artist).to.equal(artistAccounts[0].address);
    expect(unstakedEventData.staker).to.equal(userAccounts[0].address);
    expect(unstakedEventData.onftAmountMantissa).to.equal(parseEther("10"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[0].address,
        artistAccounts[0].address
      )
    ).to.equal(0);

    expect(await onft.balanceOf(userAccounts[0].address)).to.equal(
      user0ONFTBalanceMantissa.add(parseEther("10"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.sub(parseEther("10"))
    );

    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[0].address)
    ).to.equal(user0TotalStakedMantissa.sub(parseEther("10")));

    // user1 unstakes from artist0
    let user1ONFTBalanceMantissa = await onft.balanceOf(
      userAccounts[1].address
    );
    artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );

    // added test here for user total staked
    let user1TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[1].address
    );
    expect(user1TotalStakedMantissa).to.equal(parseEther("30"));
    // added test here for user total staked

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[0].address
      )
    ).to.equal(parseEther("10"));

    UnstakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Unstaked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    await (
      await artistStaking
        .connect(userAccounts[1])
        .unstakeFromArtist(artistAccounts[0].address, parseEther("10"))
    ).wait();

    unstakedEventData = await UnstakedEvent;
    expect(unstakedEventData.artist).to.equal(artistAccounts[0].address);
    expect(unstakedEventData.staker).to.equal(userAccounts[1].address);
    expect(unstakedEventData.onftAmountMantissa).to.equal(parseEther("10"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[0].address
      )
    ).to.equal(0);

    expect(await onft.balanceOf(userAccounts[1].address)).to.equal(
      user1ONFTBalanceMantissa.add(parseEther("10"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.sub(parseEther("10"))
    );

    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[1].address)
    ).to.equal(user1TotalStakedMantissa.sub(parseEther("10")));

    // user1 unstakes from artist1
    user1ONFTBalanceMantissa = await onft.balanceOf(userAccounts[1].address);
    artistStakingONFTBalanceMantissa = await onft.balanceOf(
      artistStaking.address
    );

    // added test here for user total staked
    user1TotalStakedMantissa = await artistStaking.totalStakedMantissa(
      userAccounts[1].address
    );
    expect(user1TotalStakedMantissa).to.equal(parseEther("20"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[1].address
      )
    ).to.equal(parseEther("20"));

    StakedEvent = new Promise((resolve, reject) => {
      artistStaking.once("Staked", (artist, staker, onftAmountMantissa) => {
        resolve({
          artist,
          staker,
          onftAmountMantissa,
        });
      });
    });

    await (
      await artistStaking
        .connect(userAccounts[1])
        .stakeIntoArtist(artistAccounts[1].address, parseEther("5"))
    ).wait();

    stakedEventData = await StakedEvent;
    expect(stakedEventData.artist).to.equal(artistAccounts[1].address);
    expect(stakedEventData.staker).to.equal(userAccounts[1].address);
    expect(stakedEventData.onftAmountMantissa).to.equal(parseEther("5"));

    expect(
      await artistStaking.stakerInfo(
        userAccounts[1].address,
        artistAccounts[1].address
      )
    ).to.equal(parseEther("25"));

    expect(await onft.balanceOf(userAccounts[1].address)).to.equal(
      user1ONFTBalanceMantissa.sub(parseEther("5"))
    );

    expect(await onft.balanceOf(artistStaking.address)).to.equal(
      artistStakingONFTBalanceMantissa.add(parseEther("5"))
    );
    // added expect here for total staked
    expect(
      await artistStaking.totalStakedMantissa(userAccounts[1].address)
    ).to.equal(user1TotalStakedMantissa.add(parseEther("5")));
  });

  ////// uncomment end

  it("Set staking cap per artist", async function () {
    try {
      await (
        await artistStaking
          .connect(userAccounts[0])
          .setStakingCapPerArtist(parseEther("200"))
      ).wait();
      expect(false).to.be.true;
    } catch (e) {
      expect(e.message).to.match(/Caller is not an admin/);
    }

    let ChangedStakingCapPerArtistEvent = new Promise((resolve, reject) => {
      artistStaking.once(
        "ChangedStakingCapPerArtist",
        (stakingCapPerArtist) => {
          resolve({
            stakingCapPerArtist,
          });
        }
      );
    });

    await (
      await artistStaking.setStakingCapPerArtist(parseEther("200"))
    ).wait();

    let changedStakingCapPerArtistEvent = await ChangedStakingCapPerArtistEvent;
    expect(changedStakingCapPerArtistEvent.stakingCapPerArtist).to.equal(
      parseEther("200")
    );

    expect(await artistStaking.stakingCapPerArtist()).to.equal(
      parseEther("200")
    );
  });
});
