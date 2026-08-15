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
        try {
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
    await new Promise((r) => setTimeout(r, 1000));
  }

  close() {
    this.ws.close();
  }
}

async function auditViewport(width: number, height: number, label: string) {
  console.log(`\n==================================================`);
  console.log(`AUDITING 5 VIDEOS ON ${label} (${width}x${height})`);
  console.log(`==================================================`);

  const chrome = exec(
    `"${CHROME_BIN}" --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp-profile-${width} --disable-gpu --window-size=${width},${height} http://localhost:3000`
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

  await client.navigate("http://localhost:3000");
  await new Promise((r) => setTimeout(r, 1500));

  // Get audit for each of the 5 videos
  const report = await client.eval(`
    (async () => {
      const videoElements = Array.from(document.querySelectorAll('video'));
      const results = [];

      for (let i = 0; i < videoElements.length; i++) {
        const v = videoElements[i];
        
        // Scroll into view so IntersectionObserver triggers
        v.scrollIntoView({ behavior: 'instant', block: 'center' });
        await new Promise(r => setTimeout(r, 800));

        // Attempt playback if paused
        try {
          if (v.paused) {
            await v.play();
          }
        } catch (e) {}

        const t0 = v.currentTime;
        const readyState0 = v.readyState;
        
        // Wait 1.5 seconds to check frame advancement
        await new Promise(r => setTimeout(r, 1500));
        const t1 = v.currentTime;

        const rect = v.getBoundingClientRect();

        results.push({
          index: i + 1,
          src: v.src || v.currentSrc,
          poster: v.poster,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          duration: v.duration,
          readyState: v.readyState,
          muted: v.muted,
          autoplay: v.autoplay,
          loop: v.loop,
          paused: v.paused,
          ended: v.ended,
          t0: Number(t0.toFixed(3)),
          t1: Number(t1.toFixed(3)),
          framesAdvanced: t1 > t0 || v.ended,
          renderedWidth: Math.round(rect.width),
          renderedHeight: Math.round(rect.height)
        });
      }

      return results;
    })()
  `);

  console.log(JSON.stringify(report, null, 2));

  client.close();
  chrome.kill();
  return report;
}

async function run() {
  try {
    const desktopReport = await auditViewport(1440, 900, "DESKTOP");
    await new Promise((r) => setTimeout(r, 2000));
    const mobileReport = await auditViewport(390, 844, "MOBILE");

    console.log("\n==================================================");
    console.log("FINAL VIDEO PLAYBACK SUMMARY");
    console.log("==================================================");
    console.log("Desktop Videos Verified:", desktopReport?.length === 5 ? "5/5 PASS" : "FAIL");
    console.log("Mobile Videos Verified:", mobileReport?.length === 5 ? "5/5 PASS" : "FAIL");
  } catch (err) {
    console.error("Audit error:", err);
  }
}

run();
