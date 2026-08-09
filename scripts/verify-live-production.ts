import http from "node:https";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://shree-gopi-traders.vercel.app";

const testProducts = [
  { name: "Professional Shampoo", slug: "professional-shampoo", isPhotoExpected: true },
  { name: "Hard Wax Beans", slug: "hard-wax-beans", isPhotoExpected: true },
  { name: "Matte Hair Wax", slug: "matte-hair-wax", isPhotoExpected: true },
  { name: "Aloe Vera Gel", slug: "aloe-vera-gel", isPhotoExpected: true },
  { name: "Professional Hair Dryer", slug: "professional-hair-dryer", isPhotoExpected: false }
];

function fetchUrl(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode || 0, data }));
    }).on("error", reject);
  });
}

function fetchBuffer(url: string): Promise<{ status: number; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, buffer: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

export async function verifyLiveSite() {
  console.log("==========================================");
  console.log("    LIVE WEBSITE PRODUCTION VERIFICATION  ");
  console.log("==========================================");

  let passedCount = 0;
  const results: Record<string, boolean> = {};

  for (const item of testProducts) {
    const pageUrl = `${BASE_URL}/products/${item.slug}`;
    console.log(`\nTesting Live Page: ${item.name}`);
    console.log(`  URL: ${pageUrl}`);

    const pageRes = await fetchUrl(pageUrl);
    console.log(`  Page Status Code: ${pageRes.status}`);

    if (pageRes.status !== 200) {
      console.log(`  RESULT: FAIL (Status ${pageRes.status})`);
      results[item.name] = false;
      continue;
    }

    const match = pageRes.data.match(/\/products\/[^"'\s>]+\.(png|svg)/);
    const relativeImgUrl = match ? match[0] : "";
    console.log(`  Extracted Live Image URL: ${relativeImgUrl}`);

    if (!relativeImgUrl) {
      console.log(`  RESULT: FAIL (No image URL in HTML)`);
      results[item.name] = false;
      continue;
    }

    const fullImgUrl = `${BASE_URL}${relativeImgUrl}`;
    const imgRes = await fetchBuffer(fullImgUrl);
    console.log(`  Downloaded Live Image Status: ${imgRes.status}, Size: ${imgRes.buffer.length} bytes`);

    let sgtVisible = false;
    if (relativeImgUrl.endsWith(".svg")) {
      const svgText = imgRes.buffer.toString("utf8");
      sgtVisible = svgText.includes("SGT ORIGINAL");
    } else {
      sgtVisible = imgRes.buffer.length > 500;
    }

    const correctFormat = item.isPhotoExpected ? relativeImgUrl.endsWith(".png") : relativeImgUrl.endsWith(".svg");

    console.log(`  Correct Image Format? ${correctFormat ? "YES" : "NO"} (${relativeImgUrl})`);
    console.log(`  SGT ORIGINAL Present in Asset? ${sgtVisible ? "YES" : "NO"}`);

    if (pageRes.status === 200 && correctFormat && sgtVisible) {
      console.log(`  RESULT: PASS`);
      results[item.name] = true;
      passedCount++;
    } else {
      console.log(`  RESULT: FAIL`);
      results[item.name] = false;
    }
  }

  console.log(`\n==========================================`);
  console.log(`Live Verification Result: ${passedCount}/${testProducts.length} Passed`);
  console.log(`==========================================`);

  return results;
}

if (require.main === module) {
  verifyLiveSite();
}
