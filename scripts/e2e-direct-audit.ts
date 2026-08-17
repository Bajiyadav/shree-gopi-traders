import { exec } from "node:child_process";

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
          if (msg.method === "Runtime.consoleAPICalled") {
            const text = msg.params.args.map((a: any) => a.value || a.description).join(" ");
            this.consoleMessages.push(`[${msg.params.type}] ${text}`);
            if (msg.params.type === "error") {
              this.errors.push(text);
            }
          } else if (msg.method === "Runtime.exceptionThrown") {
            this.errors.push(msg.params.exceptionDetails.text || JSON.stringify(msg.params));
          } else if (msg.method === "Network.loadingFailed") {
            this.failedRequests.push(`${msg.params.errorText}: ${msg.params.requestId}`);
          }

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
      setTimeout(resolve, 6000);
    });

    await this.send("Page.navigate", { url });
    await loadPromise;
    await new Promise((r) => setTimeout(r, 2000));
  }

  close() {
    this.ws.close();
  }
}

async function runAudit() {
  console.log("==================================================");
  console.log("STARTING DIRECT E2E LOCALHOST VERIFICATION");
  console.log("==================================================");

  const chrome = exec(
    `"${CHROME_BIN}" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp-direct-test --disable-gpu --window-size=1440,900 http://localhost:3000`
  );

  let tabs: any = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch("http://127.0.0.1:9222/json");
      tabs = await res.json();
      if (tabs && tabs.length > 0) break;
    } catch {}
  }

  if (!tabs) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9222");
  }

  const pageTab = tabs.find((t: any) => t.type === "page") || tabs[0];
  const client = new ChromeClient(pageTab.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Network.enable");

  // 1. Audit Homepage on http://localhost:3000
  await client.navigate("http://localhost:3000");

  const homeData = await client.eval(`
    (() => {
      const title = document.title;
      const h1 = document.querySelector('h1')?.innerText || '';
      const isLocalTunnelInterstitial = document.body.innerText.includes('served for free via a localtunnel') || document.body.innerText.includes('tunnel host');
      const isSreeGopiTraders = document.body.innerText.includes('Sree Gopi Traders') || title.includes('Sree Gopi Traders');
      const videos = Array.from(document.querySelectorAll('video')).map((v, i) => ({
        index: i + 1,
        src: v.src || v.currentSrc,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        duration: v.duration
      }));

      return {
        title,
        h1,
        isLocalTunnelInterstitial,
        isSreeGopiTraders,
        videoCount: videos.length,
        videos
      };
    })()
  `);

  console.log("Homepage Audit Result:", JSON.stringify(homeData, null, 2));

  // 2. Audit Products Catalogue on http://localhost:3000/products
  await client.navigate("http://localhost:3000/products");

  const catalogueData = await client.eval(`
    (() => {
      const productCards = document.querySelectorAll('a[href^="/products/"]');
      const productImages = document.querySelectorAll('img');
      const brokenImages = Array.from(productImages).filter(img => !img.complete || img.naturalWidth === 0);

      return {
        productLinkCount: productCards.length,
        totalImagesRendered: productImages.length,
        brokenImagesCount: brokenImages.length
      };
    })()
  `);

  console.log("Catalogue Audit Result:", JSON.stringify(catalogueData, null, 2));

  // 3. Audit Mobile Viewport (390x844)
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });

  await client.navigate("http://localhost:3000");
  const mobileData = await client.eval(`
    (() => {
      const isSreeGopiTraders = document.body.innerText.includes('Sree Gopi Traders');
      const videoCount = document.querySelectorAll('video').length;
      return { isSreeGopiTraders, videoCount };
    })()
  `);

  console.log("Mobile Viewport Audit Result:", JSON.stringify(mobileData, null, 2));
  console.log("Console Errors Count:", client.errors.length);
  console.log("Network Failed Requests Count:", client.failedRequests.length);

  client.close();
  chrome.kill();
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
