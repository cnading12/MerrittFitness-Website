/**
 * Generate tiny base64 blur placeholders for all images
 * Used as blurDataURL in Next.js Image component
 */
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public/images');

async function findAllImages(dir, basePath = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let images = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '_originals' || entry.name === '_backups') continue;
      images = images.concat(await findAllImages(fullPath, relPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        images.push({ fullPath, relPath });
      }
    }
  }
  return images;
}

async function generateBlurPlaceholder(fullPath) {
  const buffer = await sharp(fullPath)
    .resize(10, 10, { fit: 'inside' })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString('base64')}`;
}

async function main() {
  const images = await findAllImages(PUBLIC_DIR);
  const blurMap = {};

  for (const img of images) {
    try {
      const key = '/images/' + img.relPath.replace(/\\/g, '/');
      blurMap[key] = await generateBlurPlaceholder(img.fullPath);
      process.stdout.write('.');
    } catch (e) {
      console.error(`\nError: ${img.relPath}: ${e.message}`);
    }
  }

  console.log(`\nGenerated ${Object.keys(blurMap).length} blur placeholders`);

  const outputPath = path.join(__dirname, '../lib/blur-data.ts');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const content = `// Auto-generated blur placeholders for images
// Run: node scripts/generate-blur-placeholders.js

export const blurDataMap: Record<string, string> = ${JSON.stringify(blurMap, null, 2)};

export function getBlurDataURL(src: string): string | undefined {
  return blurDataMap[src];
}
`;

  await fs.writeFile(outputPath, content);
  console.log(`Saved to: lib/blur-data.ts`);
}

main().catch(console.error);
