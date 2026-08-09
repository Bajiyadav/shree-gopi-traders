/**
 * Removes the "SGT ORIGINAL" badge from the catalogue illustrations.
 *
 *   node scripts/imaging/strip-claim-badge.mjs --apply
 *
 * The badge is a <g id="sgt-brand-tag"> block carrying the word ORIGINAL.
 * This store is a reseller: it cannot certify a manufacturer's authenticity,
 * and an authenticity claim stated as fact that cannot be substantiated is a
 * misleading advertisement under the Consumer Protection Act 2019.
 *
 * The subtle <g id="sgt-mark"> wordmark is left in place — it is the seller's
 * initials and makes no claim at all.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const ROOT = "public/products";
// The block contains no nested <g>, so a non-greedy match to the first
// closing tag is exact.
const BADGE = /\s*<g id="sgt-brand-tag"[\s\S]*?<\/g>/g;

const files = [];
for (const cat of readdirSync(ROOT)) {
  const dir = join(ROOT, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (f.endsWith(".svg")) files.push(join(dir, f));
}

let stripped = 0, clean = 0, residue = 0;
for (const f of files) {
  const before = readFileSync(f, "utf8");
  if (!BADGE.test(before)) { BADGE.lastIndex = 0; clean++; continue; }
  BADGE.lastIndex = 0;
  const after = before.replace(BADGE, "");
  if (/ORIGINAL|Genuine|100% Original/i.test(after)) residue++;
  if (APPLY) writeFileSync(f, after);
  stripped++;
}

console.log(`
  SVGs examined     : ${files.length}
  Badge removed     : ${stripped}
  Already clean     : ${clean}
  Claim text left   : ${residue}
${APPLY ? "\n  Written.\n" : "\n  DRY RUN — re-run with --apply.\n"}`);
