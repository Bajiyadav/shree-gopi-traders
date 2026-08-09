import http from "node:https";

function fetchUrl(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode || 0, data }));
    }).on("error", reject);
  });
}

export async function verifyCategoryPage() {
  const url = "https://shree-gopi-traders.vercel.app/categories/hair-color-treatment";
  console.log(`Checking Live URL: ${url}`);
  const res = await fetchUrl(url);
  console.log("Status Code:", res.status);

  const imgMatches = res.data.match(/\/products\/hair-color-treatment\/[^"'\s>]+\.(svg|png)/g);
  const uniqueImgs = imgMatches ? Array.from(new Set(imgMatches)) : [];
  console.log("Unique Image URLs on Live Page:", uniqueImgs);
  return uniqueImgs;
}

if (require.main === module) {
  verifyCategoryPage();
}
