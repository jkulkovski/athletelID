import { artifacts, ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address} on ${network.name}`);

  // Deploy AthleteID
  const AthleteID = await ethers.getContractFactory("AthleteID");
  const athlete = await AthleteID.deploy();
  await athlete.waitForDeployment();
  const athleteAddress = await athlete.getAddress();
  console.log("AthleteID:", athleteAddress);

  // Deploy Certificate
  const Certificate = await ethers.getContractFactory("AthleteCertificate");
  const cert = await Certificate.deploy("Athlete Certificate", "ACERT");
  await cert.waitForDeployment();
  const certAddress = await cert.getAddress();
  console.log("AthleteCertificate:", certAddress);

  // Set minter to AthleteID (owner is deployer by default)
  const setMinterTx = await cert.setMinter(athleteAddress);
  await setMinterTx.wait();

  // Write deployments
  const baseDir = join(__dirname, "..", "deployments", network.name);
  mkdirSync(baseDir, { recursive: true });

  const athleteArtifact = await artifacts.readArtifact("AthleteID");
  const certArtifact = await artifacts.readArtifact("AthleteCertificate");

  const athleteOut = {
    address: athleteAddress,
    abi: athleteArtifact.abi,
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  };
  const certOut = {
    address: certAddress,
    abi: certArtifact.abi,
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  };

  writeFileSync(join(baseDir, "AthleteID.json"), JSON.stringify(athleteOut, null, 2));
  writeFileSync(join(baseDir, "AthleteCertificate.json"), JSON.stringify(certOut, null, 2));

  console.log("Deployment files written to", baseDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


