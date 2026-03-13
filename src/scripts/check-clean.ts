import { execSync } from "node:child_process";

const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();

if (status) {
	const diff = execSync("git diff --ignore-space-at-eol --text", {
		encoding: "utf-8",
	});
	console.error(
		"💥 Detected uncommitted or untracked changes after build checks. No diffs are allowed.",
	);
	console.error(
		execSync("git status --short", { encoding: "utf-8" }).trim(),
	);
	if (diff) {
		console.error(diff);
	}
	process.exit(1);
}
