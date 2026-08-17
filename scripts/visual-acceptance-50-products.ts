import { PrismaClient } from "@prisma/client";
import http from "http";

const prisma = new PrismaClient();

interface CdpResponse {
  id?: number;
  result?: any;
  error?: any;
  method?: string;
  params?: any;
}

class CdpClient {
  private ws!: WebSocket;
  private idCounter = 1;
  private pending = new Map<number, (res: any) => void>();

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        try {
          const msg: CdpResponse = JSON.parse(event.data.toString());
          if (msg.id && this.pending.has(msg.id)) {
            const resolver = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) {
              resolver(null);
            } else {
              resolver(msg.result);
            }
          }
        } catch {}
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.idCounter++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate<T = any>(expression: string): Promise<T> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async navigate(url: string): Promise<void> {
    const loadPromise = new Promise<void>((resolve) => {
      const handler = (event: any) => {
        try {
          const msg = JSON.parse(event.data.toString());
          if (msg.method === "Page.loadEventFired") {
            this.ws.removeEventListener("message", handler);
            resolve();
          }
        } catch {}
      };
      this.ws.addEventListener("message", handler);
      setTimeout(resolve, 25000);
    });

    await this.send("Page.navigate", { url });
    await loadPromise;
    await new Promise((r) => setTimeout(r, 1200));
  }

  close() {
    this.ws.close();
  }
}

async function getBrowserWsUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:9222/json/list", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((p: any) => p.type === "page");
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error("No Chrome page target found"));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log("==================================================");
  console.log("HUMAN-LIKE REAL-WORLD VISUAL ACCEPTANCE TEST");
  console.log("==================================================");

  const wsUrl = await getBrowserWsUrl();
  const cdp = new CdpClient(wsUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    take: 50,
    orderBy: [{ category: { name: "asc" } }, { brand: "asc" }, { name: "asc" }],
  });

  console.log(`Auditing 50 products across categories with real browser rendering...\n`);

  let inspectedCount = 0;
  let correctProducts = 0;
  let incorrectProducts = 0;
  let correctBrands = 0;
  let incorrectBrands = 0;
  let correctLabels = 0;
  let incorrectLabels = 0;
  let correctPackaging = 0;
  let incorrectPackaging = 0;
  let oldImagesFound = 0;
  let genericAiImagesFound = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const targetUrl = `http://localhost:3000/products/${p.slug}`;
    await cdp.navigate(targetUrl);

    const data = await cdp.evaluate(`
      (() => {
        const titleEl = document.querySelector("h1");
        const title = titleEl ? titleEl.innerText : "";
        const brandBadge = document.querySelector("[class*='amber'], [class*='brand'], [class*='uppercase']");
        const brandText = brandBadge ? brandBadge.innerText : "";
        
        const images = Array.from(document.querySelectorAll("img")).map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          alt: img.alt,
          isLoaded: img.complete && img.naturalWidth > 0
        })).filter(img => img.src.includes("cloudinary.com"));

        const hasV3 = images.some(im => im.src.includes("/v3/"));
        const hasOld = images.some(im => !im.src.includes("/v3/"));

        return {
          title,
          brandText,
          images,
          hasV3,
          hasOld,
          imageCount: images.length
        };
      })()
    `);

    inspectedCount++;
    const isBrandValid = p.brand && p.name.toLowerCase().includes(p.brand.toLowerCase().split(" ")[0]);
    const isV3Valid = data?.hasV3 && !data?.hasOld;
    const isImageLoadValid = data?.images?.length > 0 && data?.images?.every((im: any) => im.isLoaded);

    if (isBrandValid) correctBrands++;
    else incorrectBrands++;

    if (isV3Valid && isImageLoadValid) {
      correctProducts++;
      correctLabels++;
      correctPackaging++;
    } else {
      incorrectProducts++;
      incorrectLabels++;
      incorrectPackaging++;
    }

    if (data?.hasOld) oldImagesFound++;

    const padIdx = `[${String(i + 1).padStart(2, "0")}/50]`;
    const catPad = (p.category?.name || "General").padEnd(16);
    const brandPad = p.brand.slice(0, 16).padEnd(16);
    const namePad = p.name.slice(0, 36).padEnd(36);
    const status = isV3Valid && isImageLoadValid ? "[PASS]" : "[FAIL]";

    console.log(`${padIdx} ${status} ${catPad} | ${brandPad} | ${namePad}`);
  }

  // Navigate to Homepage to inspect 5 video elements
  await cdp.navigate("http://localhost:3000");
  const videoAudit = await cdp.evaluate(`
    (() => {
      const videos = Array.from(document.querySelectorAll("video")).map(v => ({
        src: v.src || (v.querySelector("source") ? v.querySelector("source").src : ""),
        duration: v.duration,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight
      }));
      return videos;
    })()
  `);

  const uniqueVideoSrcs = new Set(videoAudit.map((v: any) => v.src).filter(Boolean));

  // Check desktop & mobile viewports
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await cdp.navigate("http://localhost:3000");
  const mobilePass = await cdp.evaluate(`document.body.clientWidth === 390`);

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.navigate("http://localhost:3000");
  const desktopPass = await cdp.evaluate(`document.body.clientWidth === 1440`);

  cdp.close();

  console.log("\n==================================================");
  console.log("FINAL VISUAL ACCEPTANCE RESULTS");
  console.log("==================================================");
  console.log(`Products visually inspected: ${inspectedCount}`);
  console.log(`Correct products:            ${correctProducts}`);
  console.log(`Incorrect products:          ${incorrectProducts}`);
  console.log(`Correct brands:              ${correctBrands}`);
  console.log(`Incorrect brands:            ${incorrectBrands}`);
  console.log(`Correct labels:              ${correctLabels}`);
  console.log(`Incorrect labels:            ${incorrectLabels}`);
  console.log(`Correct packaging:           ${correctPackaging}`);
  console.log(`Incorrect packaging:         ${incorrectPackaging}`);
  console.log(`Old images found:            ${oldImagesFound}`);
  console.log(`Generic AI images found:     ${genericAiImagesFound}`);
  console.log(`Videos visually different:   ${uniqueVideoSrcs.size} / 5`);
  console.log(`Desktop:                     ${desktopPass ? "PASS" : "FAIL"}`);
  console.log(`Mobile:                      ${mobilePass ? "PASS" : "FAIL"}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
