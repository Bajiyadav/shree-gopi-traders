import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();

async function runVisualAudit() {
  console.log('Fetching 30 diverse representative active products across categories...');
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    take: 35
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const auditResults = [];

  for (let i = 0; i < Math.min(products.length, 30); i++) {
    const p = products[i];
    const url = `http://localhost:3000/products/${p.slug}`;
    console.log(`[${i + 1}/30] Auditing product page: ${p.name} (${p.slug})`);

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = response ? response.status() : 500;

    // Check images in DOM
    const imageInfo = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')).filter(img => {
        return img.src.includes('res.cloudinary.com') || img.alt;
      });
      return imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      }));
    });

    auditResults.push({
      index: i + 1,
      name: p.name,
      brand: p.brand,
      category: p.category?.name,
      slug: p.slug,
      httpStatus: status,
      dbImagesCount: p.images.length,
      dbImages: p.images,
      renderedImagesCount: imageInfo.length,
      v2CloudinaryImages: p.images.filter(img => img.includes('shree-gopi-traders/products/v2/')).length === 3
    });
  }

  await browser.close();
  await prisma.$disconnect();

  console.log('\n================ AUDIT SUMMARY ================');
  console.table(auditResults.map(r => ({
    Index: r.index,
    Name: r.name.slice(0, 30),
    Brand: r.brand,
    Category: r.category,
    Status: r.httpStatus,
    '3 V2 Cloudinary Imgs': r.v2CloudinaryImages ? 'YES (3/3)' : 'NO'
  })));

  const allPassed = auditResults.every(r => r.httpStatus === 200 && r.v2CloudinaryImages);
  console.log(`\nOverall 30-Product Visual Identity Verification: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
}

runVisualAudit().catch(err => {
  console.error('Audit error:', err);
  process.exit(1);
});
