const hre = require("hardhat");

async function main() {
  const DummyNFT = await hre.ethers.getContractFactory("DummyNFT");

  const dummyNFT = await DummyNFT.deploy();

  await dummyNFT.deployed();

  console.log("DummyNFT deployed at: ", dummyNFT.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
