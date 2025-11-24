import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "..", "contracts", "deployments");

function genMany(name, records, abiTarget, addrTarget) {
  // records: Array<{ network: string, data: { address: string, chainId: string|number, abi: any[] } }>
  const addressEntries = records
    .map(({ network, data }) => `  "${data.chainId}": { address: "${data.address}", chainId: ${Number(data.chainId)}, chainName: "${network}" }`)
    .join(",\n");
  const addresses = `export const ${name}Addresses: Record<string, { address: ` +
    "`0x${string}`, chainId: number, chainName?: string }> = {\n" +
    addressEntries +
    `\n};\n`;
  // Use the ABI of the first record (ABIs are identical across networks)
  const abiTs = `export const ${name}ABI = { abi: ${JSON.stringify(records[0].data.abi, null, 2)} as any[] };\n`;
  writeFileSync(addrTarget, addresses);
  writeFileSync(abiTarget, abiTs);
}

function main() {
  const mode = process.env.NETWORK || "all"; // "sepolia" | "localhost" | "all"
  const networks = mode === "all" ? ["localhost", "sepolia"] : [mode];

  const athleteRecords = [];
  const certRecords = [];

  for (const n of networks) {
    const dir = join(root, n);
    const athlete = JSON.parse(readFileSync(join(dir, "AthleteID.json"), "utf8"));
    const cert = JSON.parse(readFileSync(join(dir, "AthleteCertificate.json"), "utf8"));
    athleteRecords.push({ network: n, data: athlete });
    certRecords.push({ network: n, data: cert });
  }

  genMany(
    "AthleteID",
    athleteRecords,
    join(__dirname, "..", "abi", "AthleteIDABI.ts"),
    join(__dirname, "..", "abi", "AthleteIDAddresses.ts")
  );

  genMany(
    "AthleteCertificate",
    certRecords,
    join(__dirname, "..", "abi", "AthleteCertificateABI.ts"),
    join(__dirname, "..", "abi", "AthleteCertificateAddresses.ts")
  );

  console.log("ABI and addresses generated for:", networks.join(", "));
}

main();


