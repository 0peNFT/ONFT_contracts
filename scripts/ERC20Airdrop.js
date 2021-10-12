const SHA256 = require("crypto-js/sha256");
const { MerkleTree } = require("merkletreejs");

const hre = require("hardhat");

async function main() {
  await hre.run("compile");

  const [owner, spender1, spender2] = await hre.ethers.getSigners();

  const Erc20 = await hre.ethers.getContractFactory("DummyERC20");

  const erc20 = await Erc20.deploy(hre.ethers.utils.parseEther("10000"));

  await erc20.deployed();

  console.log("dummy erc20 deployed at: ", erc20.address);

  const hashedLeaves = [
    owner.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
    spender1.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
    spender2.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10"),
  ].map(SHA256);
  const tree = new MerkleTree(hashedLeaves, SHA256, { sort: true });

  console.log("root", tree.getRoot().toString());
  const root = "0x" + tree.getRoot().toString("hex");

  // We get the contract to deploy
  const ERC20AirDrop = await hre.ethers.getContractFactory("ERC20AirDrop");
  const airdrop = await ERC20AirDrop.deploy();
  // erc20.address, root, true

  await airdrop.deployed();

  console.log("AirDrop deployed to:", airdrop.address);

  await erc20.approve(airdrop.address, hre.ethers.utils.parseEther("10"));
  console.log("spent", await airdrop.spent(owner.address));

  console.log(await airdrop.merkleRoot());

  const leafHash = SHA256(
    owner.address.toLowerCase() + " " + hre.ethers.utils.parseEther("10")
  );
  console.log(
    "proof ",
    tree.getProof(leafHash).map((proof) => "0x" + proof.data.toString("hex"))
  );
  MerkleTree.print(tree);
  await airdrop.getTokensByMerkleProof(
    tree.getProof(leafHash).map((proof) => "0x" + proof.data.toString("hex")),
    owner.address,
    hre.ethers.utils.parseEther("10")
  );

  console.log("spent", await airdrop.spent(owner.address));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
