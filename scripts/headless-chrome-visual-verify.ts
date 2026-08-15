import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_DIR = path.join(process.cwd(), "public", "screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const tests = [
  {
    name: "homepage-hero-desktop.png",
    url: "http://localhost:3000",
    windowSize: "1440,900",
  },
  {
    name: "homepage-hero-mobile.png",
    url: "http://localhost:3000",
    windowSize: "390,844",
  },
  {
    name: "product-gallery-desktop.png",
    url: "http://localhost:3000/products/high-frequency-facial-machine",
    windowSize: "1440,900",
  },
  {
    name: "product-gallery-mobile.png",
    url: "http://localhost:3000/products/high-frequency-facial-machine",
    windowSize: "390,844",
  },
];

console.log("=== HEADLESS CHROME VISUAL CAPTURE ===");
for (const t of tests) {
  const dest = path.join(OUTPUT_DIR, t.name);
  const cmd = `"${CHROME_BIN}" --headless=new --screenshot="${dest}" --window-size=${t.windowSize} --virtual-time-budget=5000 "${t.url}"`;
  console.log(`Capturing ${t.name} from ${t.url}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
    const stat = fs.statSync(dest);
    console.log(`-> Saved ${t.name} (${(stat.size / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.error(`-> Error capturing ${t.name}:`, err.message);
  }
}

console.log("\nVisual capture complete. Screenshots stored in public/screenshots/");
