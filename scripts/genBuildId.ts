import { format } from "date-fns";
import cp from "node:child_process";
import { writeFileSync } from "node:fs";

process.env.TZ = "Asia/Tokyo";
const timestamp = format(new Date(), "yyyyMMddHHmm");
const commitHash = cp.execSync("git rev-parse --short=7 HEAD", { encoding: "utf8" }).trim();

const buildId = `${timestamp}-${commitHash}`;
console.log("Build ID:", buildId);

writeFileSync(".env.local", `VITE_BUILD_ID=${buildId}`);
