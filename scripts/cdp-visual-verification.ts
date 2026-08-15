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

  constructor(private wsUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg: CdpResponse = JSON.parse(event.data.toString());
        if (msg.method === "Runtime.consoleAPICalled") {
          const text = msg.params.args.map((a: any) => a.value || a.description).join(" ");
          this.consoleMessages.push(`[${msg.params.type}] ${text}`);
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.errors.push(msg.params.exceptionDetails.text || JSON.stringify(msg.params));
        }

        if (msg.id && this.pending.has(msg.id)) {
          const resolver = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            console.error("CDP error:", msg.error);
            resolver(null);
          } else {
            resolver(msg.result);
          }
        }
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
    await new Promise((r) => setTimeout(r, 1000));
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log("1. Launching Google Chrome headless with Remote Debugging...");
  const chrome = exec(
    `"${CHROME_BIN}" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp-profile --disable-gpu --window-size=1440,900 http://localhost:3000`
  );

  let connected = false;
  let tabs: any = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch("http://127.0.0.1:9222/json");
      tabs = await res.json();
      if (tabs && tabs.length > 0) {
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected || !tabs) {
    throw new Error("Could not connect to Chrome on port 9222");
  }

  try {
    const pageTab = tabs.find((t: any) => t.type === "page") || tabs[0];
    if (!pageTab) throw new Error("No Chrome tab found");

    const client = new ChromeClient(pageTab.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Runtime.enable");
    await client.send("Page.enable");

    console.log("\n==================================================");
    console.log("2. AUDITING HOMEPAGE HERO VIDEO");
    console.log("==================================================");
    await client.navigate("http://localhost:3000");

    const heroVideoInfo = await client.eval(`
      (() => {
        const v = document.querySelector('video');
        if (!v) return { exists: false };
        const rect = v.getBoundingClientRect();
        return {
          exists: true,
          src: v.src,
          poster: v.poster,
          muted: v.muted,
          autoplay: v.autoplay,
          loop: v.loop,
          paused: v.paused,
          currentTime: v.currentTime,
          duration: v.duration,
          width: rect.width,
          height: rect.height,
          objectFit: getComputedStyle(v).objectFit,
          zIndex: getComputedStyle(v.parentElement).zIndex,
          position: getComputedStyle(v.parentElement).position
        };
      })()
    `);

    console.log("Hero Video Element Audit:", heroVideoInfo);

    console.log("\nTesting video playback to completion...");
    await new Promise((r) => setTimeout(r, 3000));

    const heroAfterPlay = await client.eval(`
      (() => {
        const v = document.querySelector('video');
        if (!v) return null;
        return {
          currentTime: v.currentTime,
          paused: v.paused,
          ended: v.ended,
          loop: v.loop
        };
      })()
    `);
    console.log("Hero Video Playback State:", heroAfterPlay);

    console.log("\n==================================================");
    console.log("3. AUDITING SECOND PROMOTIONAL VIDEO SECTION");
    console.log("==================================================");
    const secondVideoInfo = await client.eval(`
      (() => {
        const videos = document.querySelectorAll('video');
        if (videos.length < 2) return { exists: false, count: videos.length };
        const v2 = videos[1];
        const rect = v2.getBoundingClientRect();
        return {
          exists: true,
          count: videos.length,
          src: v2.src,
          muted: v2.muted,
          loop: v2.loop,
          width: rect.width,
          height: rect.height
        };
      })()
    `);
    console.log("Second Promotional Video Audit:", secondVideoInfo);

    console.log("\n==================================================");
    console.log("4. AUDITING PRODUCT CATALOGUE (/products)");
    console.log("==================================================");
    await client.navigate("http://localhost:3000/products");

    const catalogueInfo = await client.eval(`
      (() => {
        const cards = document.querySelectorAll('article');
        const text = document.body.innerText;
        return {
          cardCount: cards.length,
          showingTextMatch: text.match(/Showing \\d+ of (\\d+) product/) ? text.match(/Showing \\d+ of (\\d+) product/)[0] : 'not found'
        };
      })()
    `);
    console.log("Catalogue Page Info:", catalogueInfo);

    console.log("\n==================================================");
    console.log("5. AUDITING PRODUCT DETAIL PAGE 3-IMAGE GALLERY");
    console.log("==================================================");
    await client.navigate("http://localhost:3000/products/high-frequency-facial-machine");

    const galleryCheck1 = await client.eval(`
      (() => {
        const mainImg = document.querySelector('article img, .aspect-\\\\[4\\\\/3\\\\] img, .aspect-square img, main img');
        const thumbs = document.querySelectorAll('button[aria-label*=\"View 1\"], button[aria-label*=\"View 2\"], button[aria-label*=\"View 3\"], button[aria-label*=\"image\"]');
        return {
          mainImgSrc: mainImg ? mainImg.src : 'none',
          thumbCount: thumbs.length,
        };
      })()
    `);
    console.log("Initial Gallery State:", galleryCheck1);

    // Click thumbnail 2
    await client.eval(`
      (() => {
        const thumbs = document.querySelectorAll('button[aria-label*=\"View 2\"], button[aria-label*=\"image 2\"]');
        if (thumbs.length > 0) thumbs[0].click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const galleryCheck2 = await client.eval(`
      (() => {
        const mainImg = document.querySelector('article img, .aspect-\\\\[4\\\\/3\\\\] img, .aspect-square img, main img');
        return { mainImgSrc: mainImg ? mainImg.src : 'none' };
      })()
    `);
    console.log("After Clicking Thumbnail 2 (Angle):", galleryCheck2);

    // Click thumbnail 3
    await client.eval(`
      (() => {
        const thumbs = document.querySelectorAll('button[aria-label*=\"View 3\"], button[aria-label*=\"image 3\"]');
        if (thumbs.length > 0) thumbs[0].click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const galleryCheck3 = await client.eval(`
      (() => {
        const mainImg = document.querySelector('article img, .aspect-\\\\[4\\\\/3\\\\] img, .aspect-square img, main img');
        return { mainImgSrc: mainImg ? mainImg.src : 'none' };
      })()
    `);
    console.log("After Clicking Thumbnail 3 (Detail):", galleryCheck3);

    console.log("\n==================================================");
    console.log("6. AUDITING BROWSER LOGS & ERRORS");
    console.log("==================================================");
    console.log(`Captured Console Messages: ${client.consoleMessages.length}`);
    console.log(`Captured Runtime Errors: ${client.errors.length}`);
    if (client.errors.length > 0) {
      console.error("Errors found:", client.errors);
    }

    client.close();
    chrome.kill();
    console.log("\nVisual Verification Complete!");
  } catch (err: any) {
    console.error("Verification failed:", err);
    chrome.kill();
  }
}

run();
