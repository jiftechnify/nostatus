export const currUnixtime = () => Math.floor(Date.now() / 1000);

export const wait = (timeoutMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeoutMs);
  });
};

const hexTable = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export const bytesToHex = (bytes: Uint8Array): string => {
  const res: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: i is always in bounds and hexTable is always accessed with a valid index
    res.push(hexTable[bytes[i]!]!);
  }
  return res.join("");
};
