const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { parseEther } = require('ethers/lib/utils');

describe('ONFT', function () {
  let ONFT;
  let onft;
  let accounts;
  let userAccounts;
  let ownerAccount;
  let miscAccounts;
  let now;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    ownerAccount = accounts[0];
    userAccounts = accounts.slice(1, 14);
    miscAccounts = accounts.slice(14, 20);

    now = Date.now();

    ONFT = await ethers.getContractFactory('ONFT');
    onft = await ONFT.deploy(
      ownerAccount.address,
      [userAccounts[0].address, userAccounts[1].address],
      [parseEther('2000000'), parseEther('500000')],
      '300',
      '7',
      '10',
      parseEther('3205'),
      '3'
    );
    await onft.deployed();
  });

  it('Should init properly', async function () {
    try {
      onft = await ONFT.deploy(
        ownerAccount.address,
        [userAccounts[0].address, userAccounts[1].address],
        [parseEther('2000000')],
        '300',
        '7',
        '10',
        parseEther('3205'),

        '3'
      );
      await onft.deployed();
      throw new Error('Should be wrong lengths of arrays');
    } catch (error) {
      expect(error.message).to.match(/StarToken: Wrong lengths of arrays/);
    }

    try {
      onft = await ONFT.deploy(
        ownerAccount.address,
        [userAccounts[0].address],
        [parseEther('2000000'), parseEther('500000')],
        '300',
        '7',
        '10',
        parseEther('3205'),
        '3'
      );
      await onft.deployed();
      throw new Error('Should be wrong lengths of arrays');
    } catch (error) {
      expect(error.message).to.match(/StarToken: Wrong lengths of arrays/);
    }

    let admin = await onft.admin();
    expect(admin).to.equal(ownerAccount.address);

    let nextMintStartTime = await onft.nextMintStartTime();
    expect(nextMintStartTime.gt(Math.floor(now / 1000).toString())).to.be.true;

    let nextYearStartTime = await onft.nextYearStartTime();
    expect(nextYearStartTime.gt(Math.floor(now / 1000).toString())).to.be.true;

    let totalSupplyThisYear = await onft.totalSupplyThisYear();
    expect(totalSupplyThisYear).to.equal(parseEther('2500000'));

    let weeklyInflationAmt = await onft.weeklyInflationAmt();
    expect(weeklyInflationAmt).to.equal(
      totalSupplyThisYear.mul('300').div('10000').div('52')
    );

    let inflationBasisPoint = await onft.inflationBasisPoint();
    expect(inflationBasisPoint).to.equal('300');

    let mintLockPeriodSecs = await onft.mintLockPeriodSecs();
    expect(mintLockPeriodSecs).to.equal('7');

    let inflationLockPeriodSecs = await onft.inflationLockPeriodSecs();
    expect(inflationLockPeriodSecs).to.equal('10');

    let tempNextMintStartTime = await onft.tempNextMintStartTime();
    expect(tempNextMintStartTime.gt(Math.floor(now / 1000).toString())).to.be
      .true;

    let tempInflationWeeklyMintAmt = await onft.tempInflationWeeklyMintAmt();
    expect(tempInflationWeeklyMintAmt).to.equal(parseEther('3205'));

    let tempInflationMaxMint = await onft.tempInflationMaxMint();
    expect(tempInflationMaxMint).to.equal('3');
  });

  it('Mint Temp', async function () {
    try {
      let mintTempTx = await onft
        .connect(userAccounts[0])
        .mintTemp(userAccounts[4].address);
      await mintTempTx.wait();
      throw new Error('Caller should not be an admin');
    } catch (error) {
      expect(error.message).to.match(/Caller is not an admin/);
    }

    await new Promise((resolve) => setTimeout(resolve, 7000));

    let tempNextMintStartTimeBefore = await onft.tempNextMintStartTime();

    mintTempTx = await onft.mintTemp(userAccounts[4].address);
    await mintTempTx.wait();

    let tempNextMintStartTime = await onft.tempNextMintStartTime();
    expect(tempNextMintStartTime).to.equal(tempNextMintStartTimeBefore.add('7'));

    let tempInflationSupplyMinted = await onft.tempInflationSupplyMinted();
    expect(tempInflationSupplyMinted).to.equal(parseEther('3205'));

    let tempInflationMintCount = await onft.tempInflationMintCount();
    expect(tempInflationMintCount).to.equal('1');

    let totalSupply = await onft.totalSupply();
    expect(totalSupply).to.equal(parseEther((2500000 + 3205).toString()));

    // test for requirements
    await new Promise((resolve) => setTimeout(resolve, 7000));
    mintTempTx = await onft.mintTemp(userAccounts[0].address);
    await mintTempTx.wait();

    tempInflationMintCount = await onft.tempInflationMintCount();
    expect(tempInflationMintCount).to.equal('2');

    try {
      mintTempTx = await onft.mintTemp(userAccounts[0].address);
      await mintTempTx.wait();
      throw new Error('Weekly temporary inflation should already be minted');
    } catch (error) {
      expect(error.message).to.match(
        /Weekly temporary inflation already minted/
      );
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 7000));
      mintTempTx = await onft.mintTemp(userAccounts[0].address);
      await mintTempTx.wait();

      tempInflationMintCount = await onft.tempInflationMintCount();
      expect(tempInflationMintCount).to.equal('3');

      await new Promise((resolve) => setTimeout(resolve, 7000));
      mintTempTx = await onft.mintTemp(userAccounts[0].address);
      await mintTempTx.wait();

      throw new Error('Temporary inflation should be over');
    } catch (error) {
      expect(error.message).to.match(/Temporary inflation is over/);
    }
  });

  it('Mint', async function () {
    try {
      let mintTx = await onft
        .connect(userAccounts[0])
        .mint(userAccounts[0].address);
      await mintTx.wait();
      throw new Error('Caller should not be an admin');
    } catch (error) {
      expect(error.message).to.match(/Caller is not an admin/);
    }

    let nextMintStartTimeBefore = await onft.nextMintStartTime();
    let mintLockPeriodSecs = await onft.mintLockPeriodSecs();
    let weeklyInflationAmt = await onft.weeklyInflationAmt();
    let totalSupplyBefore = await onft.totalSupply();

    await new Promise((resolve) => setTimeout(resolve, 10000));

    mintTx = await onft.mint(userAccounts[0].address);
    await mintTx.wait();

    let nextMintStartTime = await onft.nextMintStartTime();
    expect(nextMintStartTime.toString()).to.equal(
      nextMintStartTimeBefore.add(mintLockPeriodSecs).toString()
    );

    let totalSupply = await onft.totalSupply();
    expect(totalSupply).to.equal(totalSupplyBefore.add(weeklyInflationAmt));

    try {
      mintTx = await onft.mint(userAccounts[0].address);
      await mintTx.wait();
      mintTx = await onft.mint(userAccounts[0].address);
      await mintTx.wait();
      throw new Error('Weekly permanent inflation should already be minted');
    } catch (error) {
      expect(error.message).to.match(
        /Weekly permanent inflation already minted/
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

    mintTx = await onft.mint(userAccounts[0].address);
    await mintTx.wait();
  });

  it('Update Year Period', async function () {
    this.timeout(50000);
    try {
      let updateYearPeriodTx = await onft
        .connect(userAccounts[0])
        .updateYearPeriod();
      await updateYearPeriodTx.wait();
      throw new Error('Caller should not be an admin');
    } catch (error) {
      expect(error.message).to.match(/Caller is not an admin/);
    }
    try {
      updateYearPeriodTx = await onft.updateYearPeriod();
      await updateYearPeriodTx.wait();
      throw new Error('Year period should not be over');
    } catch (error) {
      expect(error.message).to.match(/Year period is not over/);
    }

    let mintLockPeriodSecs = await onft.mintLockPeriodSecs();
    let tempInflationSupplyMinted = await onft.tempInflationSupplyMinted();
    let inflationBasisPoint = await onft.inflationBasisPoint();

    let nextYearStartTimeBefore = await onft.nextYearStartTime();
    let totalSupplyThisYearBefore = await onft.totalSupplyThisYear();

    // year 1 period
    await new Promise((resolve) => setTimeout(resolve, 10000));

    updateYearPeriodTx = await onft.updateYearPeriod();
    await updateYearPeriodTx.wait();

    let nextYearStartTime = await onft.nextYearStartTime();
    expect(nextYearStartTime).to.equal(
      nextYearStartTimeBefore.add(mintLockPeriodSecs)
    );

    let totalSupplyThisYear = await onft.totalSupplyThisYear();
    expect(totalSupplyThisYear).to.equal(
      totalSupplyThisYearBefore.sub(tempInflationSupplyMinted)
    );

    let weeklyInflationAmt = await onft.weeklyInflationAmt();
    expect(weeklyInflationAmt).to.equal(
      totalSupplyThisYearBefore.mul(inflationBasisPoint).div(10000).div(52)
    );

    // year 2 period
    nextYearStartTimeBefore = await onft.nextYearStartTime();
    totalSupplyThisYearBefore = await onft.totalSupplyThisYear();

    await new Promise((resolve) => setTimeout(resolve, 10000));

    updateYearPeriodTx = await onft.updateYearPeriod();
    await updateYearPeriodTx.wait();

    nextYearStartTime = await onft.nextYearStartTime();
    expect(nextYearStartTime).to.equal(
      nextYearStartTimeBefore.add(mintLockPeriodSecs)
    );

    totalSupplyThisYear = await onft.totalSupplyThisYear();
    expect(totalSupplyThisYear).to.equal(
      totalSupplyThisYearBefore.sub(tempInflationSupplyMinted)
    );

    weeklyInflationAmt = await onft.weeklyInflationAmt();
    expect(weeklyInflationAmt).to.equal(
      totalSupplyThisYearBefore.mul(inflationBasisPoint).div(10000).div(52)
    );

    try {
      updateYearPeriodTx = await onft.updateYearPeriod();
      await updateYearPeriodTx.wait();
      throw new Error('Year period should not be over');
    } catch (error) {
      expect(error.message).to.match(/Year period is not over/);
    }
  });

  it('Pause', async function () {
    // pause and unpause called by non admin
    try {
      let pauseTx = await onft.connect(userAccounts[0]).pause();
      await pauseTx.wait();
      throw new Error('Pause should only be called by admin with pauser role');
    } catch (error) {
      expect(error.message).to.match(/must have pauser role to pause/);
    }
    try {
      let unpauseTx = await onft.connect(userAccounts[0]).unpause();
      await unpauseTx.wait();
      throw new Error(
        'Unpause should only be called by admin with pauser role'
      );
    } catch (error) {
      expect(error.message).to.match(/must have pauser role to unpause/);
    }

    // pause and unpause called by admin
    let pauseTx = await onft.connect(ownerAccount).pause();
    await pauseTx.wait();

    // trying to transfer when paused
    await new Promise((resolve) => setTimeout(resolve, 10000));
    try {
      let mintTx = await onft.mint(userAccounts[0].address);
      await mintTx.wait();
      throw new Error('Shouldnt be able to transfer while paused');
    } catch (error) {
      expect(error.message).to.match(/token transfer while paused/);
    }

    let unpauseTx = await onft.connect(ownerAccount).unpause();
    await unpauseTx.wait();

    // trying to transfer after unpause
    let mintTx = await onft.mint(userAccounts[3].address);
    await mintTx.wait();

    let weeklyInflationAmt = await onft.weeklyInflationAmt();
    let balanceUser = await onft.balanceOf(userAccounts[3].address);
    // tokens should increase by 1 ether ie amount minted
    expect(balanceUser).to.equal(weeklyInflationAmt);
  });

  it('Burn', async function () {
    // burn all user 1 account
    let balanceUser1 = await onft.balanceOf(userAccounts[0].address);
    let burnTx = await onft.connect(userAccounts[0]).burn(balanceUser1);
    await burnTx.wait();
    let balanceUser2 = await onft.balanceOf(userAccounts[0].address);
    // should have burned all
    expect(balanceUser2.toString()).to.equal('0');

    // large burn amount
    let burnAmount1 = parseEther('5000000');

    // burning more than owned
    try {
      let burnTx2 = await onft.connect(userAccounts[0]).burn(burnAmount1);
      await burnTx2.wait();
      throw new Error('Burning more than owned');
    } catch (error) {
      expect(error.message).to.match(/burn amount exceeds balance/);
    }
  });

  it('Change Admin', async function () {
    let admin = await onft.admin();
    expect(admin).to.equal(ownerAccount.address);

    try {
      let changeAdminTx = await onft
        .connect(userAccounts[0])
        .changeAdmin(userAccounts[0].address);
      await changeAdminTx.wait();
      throw new Error('Caller should not be an admin');
    } catch (error) {
      expect(error.message).to.match(/Caller is not an admin/);
    }

    changeAdminTx = await onft.changeAdmin(userAccounts[0].address);
    await changeAdminTx.wait();

    admin = await onft.admin();
    expect(admin).to.equal(userAccounts[0].address);
  });

  it('Whitelist', async function () {
    try {
      let changeWhitelistStatusTx = await onft
        .connect(userAccounts[0])
        .changeWhitelistStatus(userAccounts[0].address, true);
      await changeWhitelistStatusTx.wait();
      throw new Error('Caller should not be an admin');
    } catch (error) {
      expect(error.message).to.match(/Caller is not an admin/);
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

    let mintTx = await onft.mint(userAccounts[0].address);
    await mintTx.wait();

    let pauseTx = await onft.connect(ownerAccount).pause();
    await pauseTx.wait();

    try {
      let transferTx = await onft
        .connect(userAccounts[0])
        .transfer(userAccounts[1].address, parseEther('1'));
      await transferTx.wait();
      throw new Error('Should not be able to token transfer while paused');
    } catch (error) {
      expect(error.message).to.match(
        /ERC20Pausable: token transfer while paused/
      );
    }

    // add to whitelist
    changeWhitelistStatusTx = await onft.changeWhitelistStatus(
      userAccounts[0].address,
      true
    );
    await changeWhitelistStatusTx.wait();

    let isUser0Whitelisted = await onft.whitelist(userAccounts[0].address);
    expect(isUser0Whitelisted).to.be.true;
    let isUser1Whitelisted = await onft.whitelist(userAccounts[1].address);
    expect(isUser1Whitelisted).to.be.false;

    transferTx = await onft
      .connect(userAccounts[0])
      .transfer(userAccounts[1].address, parseEther('1'));
    await transferTx.wait();

    try {
      let transferTx = await onft
        .connect(userAccounts[1])
        .transfer(userAccounts[0].address, parseEther('0.5'));
      await transferTx.wait();
      throw new Error('Should not be able to token transfer while paused');
    } catch (error) {
      expect(error.message).to.match(
        /ERC20Pausable: token transfer while paused/
      );
    }

    // removed from whitelist
    changeWhitelistStatusTx = await onft.changeWhitelistStatus(
      userAccounts[0].address,
      false
    );
    await changeWhitelistStatusTx.wait();

    try {
      let transferTx = await onft
        .connect(userAccounts[0])
        .transfer(userAccounts[1].address, parseEther('1'));
      await transferTx.wait();
      throw new Error('Should not be able to token transfer while paused');
    } catch (error) {
      expect(error.message).to.match(
        /ERC20Pausable: token transfer while paused/
      );
    }

    try {
      let transferTx = await onft
        .connect(userAccounts[1])
        .transfer(userAccounts[0].address, parseEther('0.5'));
      await transferTx.wait();
      throw new Error('Should not be able to token transfer while paused');
    } catch (error) {
      expect(error.message).to.match(
        /ERC20Pausable: token transfer while paused/
      );
    }
  });
});
