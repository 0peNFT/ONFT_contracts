// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { parseEther } = require('@ethersproject/units');
const hre = require('hardhat');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Airdrop = await hre.ethers.getContractFactory('ERC20AirDrops');
  const airdrop = await Airdrop.deploy(
    '0xcB86db27596cD81F9e5bD9d0Bf1c5F5aDb5375Fc'
  );

  await airdrop.deployed();

  console.log('airdrop deployed to:', airdrop.address);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
