import { spawnSync } from "node:child_process";

const lefthook = process.env.LEFTHOOK;
const ci = process.env.CI;
const lefthookOff = lefthook === "0" || lefthook === "false";
const ciOn = ci !== undefined && ci !== "0" && ci !== "false";

if (lefthookOff || ciOn) {
  process.exit(0);
}

const result = spawnSync("lefthook", ["install"], { stdio: "inherit" });
if (result.error !== undefined) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
