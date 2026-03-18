/**
 * Comprehensive Image Optimization Script
 * Converts all large images to optimized WebP format
 * Resizes to reasonable max dimensions while maintaining quality
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public/images');

// Max dimensions by usage type
const CONFIGS = {
  hero: { maxWidth: 1920, maxHeight: 1280, quality: 80 },
  gallery: { maxWidth: 1600, maxHeight: 1200, quality: 78 },
  event: { maxWidth: 1200, maxHeight: 900, quality: 75 },
  overlay: { maxWidth: 800, maxHeight: 800, quality: 80, keepPng: true },
  thumbnail: { maxWidth: 400, maxHeight: 400, quality: 70 },
};

// Size threshold - only optimize files larger than 500KB
const SIZE_THRESHOLD = 500 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

// Determine config based on file path
function getConfig(relPath) {
  if (relPath.includes('overlays/')) return CONFIGS.overlay;
  if (relPath.includes('hero/')) return CONFIGS.hero;
  if (relPath.includes('events/katrina/') || relPath.includes('events/judo/')) return CONFIGS.event;
  if (relPath.includes('events/')) return CONFIGS.gallery;
  return CONFIGS.gallery;
}

async function findAllImages(dir, basePath = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let images = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      // Skip backup directories
      if (entry.name === '_originals' || entry.name === '_backups') continue;
      images = images.concat(await findAllImages(fullPath, relPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        images.push({ fullPath, relPath, ext });
      }
    }
  }

  return images;
}

async function optimizeImage(image) {
  const { fullPath, relPath, ext } = image;
  const config = getConfig(relPath);
  const originalSize = await getFileSize(fullPath);

  // Skip small files
  if (originalSize < SIZE_THRESHOLD) {
    return { skipped: true, relPath, reason: 'small', originalSize };
  }

  try {
    const pipeline = sharp(fullPath);
    const metadata = await pipeline.metadata();

    // For overlays that need transparency, optimize as PNG
    if (config.keepPng && ext === '.png') {
      let processor = sharp(fullPath);

      if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
        processor = processor.resize(config.maxWidth, config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const outputBuffer = await processor
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();

      // Only write if smaller
      if (outputBuffer.length < originalSize) {
        await fs.writeFile(fullPath, outputBuffer);
        return {
          relPath,
          originalSize,
          newSize: outputBuffer.length,
          format: 'png',
          newPath: relPath,
        };
      }
      return { skipped: true, relPath, reason: 'already-optimal', originalSize };
    }

    // For everything else, convert to WebP
    let processor = sharp(fullPath);

    if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
      processor = processor.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const baseName = path.basename(relPath, ext);
    const dirName = path.dirname(relPath);
    const webpRelPath = path.join(dirName, baseName + '.webp');
    const webpFullPath = path.join(PUBLIC_DIR, webpRelPath);

    // If already webp, just resize/recompress
    if (ext === '.webp') {
      const outputBuffer = await processor
        .webp({ quality: config.quality, effort: 6 })
        .toBuffer();

      if (outputBuffer.length < originalSize) {
        await fs.writeFile(fullPath, outputBuffer);
        return {
          relPath,
          originalSize,
          newSize: outputBuffer.length,
          format: 'webp',
          newPath: relPath,
        };
      }
      return { skipped: true, relPath, reason: 'already-optimal', originalSize };
    }

    // Convert non-webp to webp
    const outputBuffer = await processor
      .webp({ quality: config.quality, effort: 6 })
      .toBuffer();

    await fs.writeFile(webpFullPath, outputBuffer);

    // Remove original (it's been converted)
    if (webpFullPath !== fullPath) {
      await fs.unlink(fullPath);
    }

    return {
      relPath,
      originalSize,
      newSize: outputBuffer.length,
      format: 'webp',
      newPath: webpRelPath,
      converted: true,
    };
  } catch (error) {
    console.error(`  Error: ${relPath}: ${error.message}`);
    return { skipped: true, relPath, reason: 'error', originalSize };
  }
}

async function main() {
  console.log('Image Optimization Script\n');
  console.log('='.repeat(60));

  const images = await findAllImages(PUBLIC_DIR);
  console.log(`Found ${images.length} images\n`);

  const results = [];
  let totalOriginal = 0;
  let totalNew = 0;
  let converted = 0;
  let skipped = 0;

  // Track path changes for code updates
  const pathMapping = {};

  for (const image of images) {
    const result = await optimizeImage(image);
    results.push(result);

    if (result.skipped) {
      skipped++;
      process.stdout.write('.');
    } else {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      converted++;

      const savings = ((1 - result.newSize / result.originalSize) * 100).toFixed(1);
      console.log(`\n  ${result.relPath}`);
      console.log(`    ${formatSize(result.originalSize)} -> ${formatSize(result.newSize)} (${savings}% smaller)`);

      if (result.converted && result.relPath !== result.newPath) {
        const oldRef = '/images/' + result.relPath.replace(/\\/g, '/');
        const newRef = '/images/' + result.newPath.replace(/\\/g, '/');
        pathMapping[oldRef] = newRef;
      }
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Total images found: ${images.length}`);
  console.log(`  Optimized: ${converted}`);
  console.log(`  Skipped (small/optimal): ${skipped}`);
  console.log(`  Original total: ${formatSize(totalOriginal)}`);
  console.log(`  Optimized total: ${formatSize(totalNew)}`);
  console.log(`  Total savings: ${formatSize(totalOriginal - totalNew)}`);

  // Save path mapping for code updates
  const mappingFile = path.join(__dirname, 'path-mapping.json');
  await fs.writeFile(mappingFile, JSON.stringify(pathMapping, null, 2));
  console.log(`\nPath mapping saved to: scripts/path-mapping.json`);
  console.log(`${Object.keys(pathMapping).length} paths need updating in code`);
}

main().catch(console.error);
