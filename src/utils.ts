export const currUnixtime = () => Math.floor(Date.now() / 1000);

export const wait = (timeoutMs: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeoutMs);
  });
};
