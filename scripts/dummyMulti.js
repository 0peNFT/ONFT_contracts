const hre = require("hardhat");

async function main() {
  const DummyMulti = await hre.ethers.getContractFactory("DummyMulti");

  const dummyMulti = await DummyMulti.deploy();

  await dummyMulti.deployed();

  console.log("DummyMulti deployed at: ", dummyMulti.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
