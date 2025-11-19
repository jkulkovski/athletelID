export async function pinFileToIPFS(file: File, jwt: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form
  });
  if (!res.ok) throw new Error(`Pinata error: ${await res.text()}`);
  const j = await res.json();
  return `ipfs://${j.IpfsHash}`;
}


