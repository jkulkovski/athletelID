import { run } from "hardhat";

async function main() {
  const athlete = process.env.ATHLETEID_ADDRESS as string | undefined;
  const cert = process.env.CERTIFICATE_ADDRESS as string | undefined;

  if (athlete) {
    await run("verify:verify", { address: athlete, constructorArguments: [] });
  }

  if (cert) {
    await run("verify:verify", { address: cert, constructorArguments: ["Athlete Certificate", "ACERT"] });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


