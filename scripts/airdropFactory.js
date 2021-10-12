const SHA256 = require("crypto-js/sha256");
const { MerkleTree } = require("merkletreejs");

const hre = require("hardhat");

async function main() {
  await hre.run("compile");

  const [owner, spender1, spender2] = await hre.ethers.getSigners();

  const AirDropFactory = await hre.ethers.getContractFactory("AirDropFactory");

  const airdropFactory = await AirDropFactory.deploy();

  await airdropFactory.deployed();

  console.log("AirDropFactory deployed at: ", airdropFactory.address);

  const ERC20AirDrop = await hre.ethers.getContractFactory("ERC20AirDrop");
  const airdrop = await ERC20AirDrop.deploy();

  await airdrop.deployed();

  console.log("AirDrop deployed to:", airdrop.address);

  const hashedLeaves = [
    owner.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
    spender1.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
    spender2.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
  ].map(SHA256);
  const tree = new MerkleTree(hashedLeaves, SHA256, { sort: true });

  console.log("root", tree.getRoot().toString());
  const root = "0x" + tree.getRoot().toString("hex");

  const trx = await airdropFactory.createAirdrop(
    airdrop.address,
    owner.address,
    "0x50806f12a519E6Da26cCc9125C6421D2F630a4dF",
    root,
    true
  );

  const event = (await trx.wait()).events[0];
  console.log("trx", event.args[0]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
