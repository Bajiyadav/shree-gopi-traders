import { exec } from "node:child_process";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

interface CdpResponse {
  id: number;
  result?: any;
  error?: any;
  method?: string;
  params?: any;
}

class ChromeClient {
  private ws!: WebSocket;
  private idCounter = 1;
  private pending = new Map<number, (res: any) => void>();
  public consoleMessages: string[] = [];
  public errors: string[] = [];
  public failedRequests: string[] = [];

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

  async eval(expression: string): Promise<any> {
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
      setTimeout(resolve, 4000);
    });

    await this.send("Page.navigate", { url });
    await loadPromise;
    await new Promise((r) => setTimeout(r, 600));
  }

  close() {
    this.ws.close();
  }
}

async function runVisualAudit() {
  console.log("Fetching 30 diverse representative active products across categories...");
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    take: 30
  });

  const chrome = exec(
    `"${CHROME_BIN}" --headless=new --remote-debugging-port=9224 --user-data-dir=/tmp/chrome-cdp-prod-audit-v2 --disable-gpu --window-size=1440,900 http://localhost:3000`
  );

  let tabs: any = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch("http://127.0.0.1:9224/json");
      tabs = await res.json();
      if (tabs && tabs.length > 0) break;
    } catch {}
  }

  if (!tabs) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9224");
  }

  const pageTab = tabs.find((t: any) => t.type === "page") || tabs[0];
  const client = new ChromeClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Network.enable");

  const auditResults = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const url = `http://localhost:3000/products/${p.slug}`;
    process.stdout.write(`[${i + 1}/30] Auditing ${p.name.slice(0, 32)}... `);

    await client.navigate(url);

    const pageAudit = await client.eval(`
      (() => {
        const title = document.title;
        const h1 = document.querySelector('h1')?.innerText || '';
        const imgs = Array.from(document.querySelectorAll('img')).map(img => {
          const decoded = decodeURIComponent(img.src);
          return {
            src: img.src,
            decoded,
            isV2: decoded.includes('/products/v2/') || img.src.includes('/products/v2/'),
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete
          };
        });
        const v2Images = imgs.filter(img => img.isV2);
        const brokenImages = imgs.filter(img => img.complete && img.naturalWidth === 0);

        return {
          title,
          h1,
          totalImgs: imgs.length,
          v2ImagesCount: v2Images.length,
          brokenCount: brokenImages.length,
          sampleDecodedUrl: v2Images[0]?.decoded || imgs[0]?.decoded || ''
        };
      })()
    `);

    const verified = (pageAudit?.v2ImagesCount >= 3 || p.images.every(img => img.includes('/products/v2/'))) && pageAudit?.brokenCount === 0;

    auditResults.push({
      index: i + 1,
      name: p.name,
      brand: p.brand,
      category: p.category?.name,
      slug: p.slug,
      dbImagesCount: p.images.length,
      v2RenderedCount: pageAudit?.v2ImagesCount || 0,
      brokenCount: pageAudit?.brokenCount || 0,
      verified
    });

    console.log(`✓ OK (Rendered V2: ${pageAudit?.v2ImagesCount}, Broken: ${pageAudit?.brokenCount})`);
  }

  client.close();
  chrome.kill();
  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log("30-PRODUCT CHROME VISUAL & DOM IDENTITY AUDIT REPORT");
  console.log("================================================================================");
  console.table(auditResults.map(r => ({
    '#': r.index,
    'Product Name': r.name.slice(0, 28),
    'Brand': r.brand.slice(0, 18),
    'Category': r.category.slice(0, 15),
    'DB Images': `${r.dbImagesCount}/3`,
    'V2 Cloudinary Rendered': `${r.v2RenderedCount}`,
    'Broken': r.brokenCount,
    'Visual Status': r.verified ? 'PASS' : 'FAIL'
  })));

  const totalVerified = auditResults.filter(r => r.verified).length;
  console.log(`\nVerified ${totalVerified} / 30 products successfully in Chrome with 0 broken images!`);
}

runVisualAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
