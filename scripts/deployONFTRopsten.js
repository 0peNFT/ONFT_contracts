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
  const ONFT = await hre.ethers.getContractFactory('ONFT');
  const onft = await ONFT.deploy(
    '0x48738A0c999fD2decfc28099Ded3648Da5155FF6',
    ['0x48738A0c999fD2decfc28099Ded3648Da5155FF6'],
    [parseEther('2500000')],
    '300',
    '1800',
    '3600',
    parseEther('3205'),
    '3'
  );

  await onft.deployed();

  console.log('onft deployed to:', onft.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
