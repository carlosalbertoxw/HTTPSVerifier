// Builds the Chrome Web Store package: dist/https-verifier-<version>.zip, with
// manifest.json at the root and only the files the extension needs at runtime.
// No dependencies: the ZIP is written with node:zlib. Entries use a fixed date
// and order, so the same sources always produce the same ZIP.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateRawSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Single source of truth for what ships. Tests, store assets, docs and
// tooling stay out of the package.
export const PACKAGE_ENTRIES = [
  "manifest.json",
  "background.js",
  "page-check.js",
  "insecure-url.js",
  "issues.js",
  "settings.js",
  "popup.html",
  "popup.js",
  "_locales",
  "images",
];

export function listFiles(entry) {
  const absolute = path.join(ROOT, entry);
  if (!existsSync(absolute)) {
    throw new Error(`Package entry not found: ${entry}`);
  }
  if (!statSync(absolute).isDirectory()) {
    return [entry];
  }
  return readdirSync(absolute)
    .sort()
    .flatMap((child) => listFiles(`${entry}/${child}`));
}

// Fails the build when a packaged file references another file that is not
// packaged (a new module missing from PACKAGE_ENTRIES would otherwise only
// break once installed from the store).
function checkReferences(files) {
  const packaged = new Set(files);
  const missing = [];
  const require = (from, reference) => {
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(from), reference)
    );
    if (!packaged.has(target)) {
      missing.push(`${from} -> ${reference}`);
    }
  };

  for (const file of files) {
    const text = file.match(/\.(js|html)$/)
      ? readFileSync(path.join(ROOT, file), "utf8")
      : "";
    for (const [, reference] of text.matchAll(
      /(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g
    )) {
      require(file, reference);
    }
    for (const [, reference] of text.matchAll(/\bsrc="([^":]+)"/g)) {
      require(file, reference);
    }
  }

  const manifest = JSON.parse(readFileSync(path.join(ROOT, "manifest.json")));
  for (const reference of [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
  ]) {
    require("manifest.json", reference);
  }

  if (missing.length > 0) {
    throw new Error(
      `Files referenced but not packaged:\n  ${missing.join("\n  ")}`
    );
  }
  return manifest;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// 1980-01-01 00:00, the earliest date the ZIP format can store.
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file, "utf8");
    const data = readFileSync(path.join(ROOT, file));
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    // Extra field, comment, disk number, attributes: all zero.
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

// Only when run directly, not when imported by the e2e test (which loads the
// same files into Chrome).
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const files = PACKAGE_ENTRIES.flatMap(listFiles);
  const manifest = checkReferences(files);
  const output = path.join(
    ROOT,
    "dist",
    `https-verifier-${manifest.version}.zip`
  );

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, createZip(files));
  console.log(`${path.relative(ROOT, output)} (${files.length} files)`);
}
