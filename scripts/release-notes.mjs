// Prints the CHANGELOG.md section of a version, for the GitHub release notes.
// Usage: node scripts/release-notes.mjs 1.4.0   (a "v" prefix or a "-rc.1"
// suffix is ignored). Fails if the changelog has no section for the version.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function releaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) {
    return null;
  }
  const end = lines.findIndex(
    (line, index) =>
      index > start && (line.startsWith("## [") || /^\[[^\]]+\]: /.test(line))
  );
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

// Only when run directly, not when imported by the tests.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const version = (process.argv[2] || "").replace(/^v/, "").replace(/-.*$/, "");
  const changelog = readFileSync(
    new URL("../CHANGELOG.md", import.meta.url),
    "utf8"
  );
  const notes = version && releaseNotes(changelog, version);
  if (!notes) {
    console.error(`CHANGELOG.md has no section for version "${version}".`);
    process.exit(1);
  }
  console.log(notes);
}
