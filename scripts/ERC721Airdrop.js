const SHA256 = require("crypto-js/sha256");
const { MerkleTree } = require("merkletreejs");

const hre = require("hardhat");

async function main() {
  await hre.run("compile");

  const [owner, spender] = await hre.ethers.getSigners();

  console.log("Owner", owner.address);

  const DummyNFT = await hre.ethers.getContractFactory("DummyNFT");

  const dummyNFT = await DummyNFT.deploy();

  await dummyNFT.deployed();

  console.log("DummyNFT deployed at: ", dummyNFT.address);

  await dummyNFT.mint(owner.address, 10);

  const hashedLeaves = [spender.address.toLowerCase() + " 10"].map(SHA256);
  const tree = new MerkleTree(hashedLeaves, SHA256);

  console.log(tree.getRoot().toString());
  const root = "0x" + tree.getRoot().toString("hex");

  // We get the contract to deploy
  const ERC721AirDrop = await hre.ethers.getContractFactory("ERC721AirDrop");
  const airdrop = await ERC721AirDrop.deploy();
  // dummyNFT.address, root, true

  await airdrop.deployed();
  console.log(await airdrop.spent(dummyNFT.address, 10));

  await dummyNFT.setApprovalForAll(airdrop.address, true);

  console.log("AirDrop deployed to:", airdrop.address);

  console.log(await airdrop.merkleRoot());

  await airdrop.getTokensByMerkleProof([], spender.address, "10");

  console.log("Owner of 10:", await dummyNFT.ownerOf(10));
  console.log("Spenders address:", spender.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
