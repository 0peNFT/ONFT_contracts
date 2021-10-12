const SHA256 = require("crypto-js/sha256");
const { MerkleTree } = require("merkletreejs");

const hre = require("hardhat");

async function main() {
  await hre.run("compile");

  const [owner, spender] = await hre.ethers.getSigners();

  console.log("Owner", owner.address);

  const DummyERC1155 = await hre.ethers.getContractFactory("DummyMulti");

  const dummyERC1155 = await DummyERC1155.deploy();

  await dummyERC1155.deployed();

  console.log("DummyERC1155 deployed at: ", dummyERC1155.address);

  await dummyERC1155.mint(owner.address, 10, hre.ethers.utils.parseEther("10"));
  await dummyERC1155.mint(owner.address, 11, hre.ethers.utils.parseEther("11"));

  const hashedLeaves = [
    spender.address.toLowerCase() +
      " 10 " +
      hre.ethers.utils.parseEther("10") +
      "," +
      spender.address.toLowerCase() +
      " 11 " +
      hre.ethers.utils.parseEther("11"),
  ].map(SHA256);
  const tree = new MerkleTree(hashedLeaves, SHA256);

  console.log("root", tree.getRoot().toString());
  const root = "0x" + tree.getRoot().toString("hex");

  // We get the contract to deploy
  const ERC1155AirDrop = await hre.ethers.getContractFactory("ERC1155AirDrop");
  const airdrop = await ERC1155AirDrop.deploy();
  //dummyERC1155.address, root, true

  await airdrop.deployed();
  console.log(await airdrop.spent(spender.address, 10));

  await dummyERC1155.setApprovalForAll(airdrop.address, true);

  console.log("AirDrop deployed to:", airdrop.address);

  console.log(await airdrop.merkleRoot());

  await airdrop.getTokensByMerkleProof(
    [],
    spender.address,
    ["10", "11"],
    [hre.ethers.utils.parseEther("10"), hre.ethers.utils.parseEther("11")]
  );

  console.log(
    "Owner of 10:",
    (await dummyERC1155.balanceOf(spender.address, 10)).toString()
  );
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
