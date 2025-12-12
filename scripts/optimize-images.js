/**
 * Image Optimization Script
 * Converts large PNG/JPG files to optimized WebP format
 * Keeps originals in a backup folder
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public/images');

// Configuration for different image types
const config = {
  hero: {
    maxWidth: 2400,
    maxHeight: 1600,
    quality: 85,
  },
  events: {
    maxWidth: 1920,
    maxHeight: 1280,
    quality: 82,
  },
  overlays: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 80,
    // Keep PNG for transparency
    keepFormat: false,
  },
  thumbnails: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 75,
  }
};

// Files to optimize with their target settings
const optimizationTargets = [
  // Hero images - these are the biggest offenders
  { src: 'hero/Glass-1.png', config: 'hero', priority: true },
  { src: 'hero/Glass-Group.png', config: 'hero' },
  { src: 'hero/Cafe-East.png', config: 'hero' },
  { src: 'hero/Cafe-West.png', config: 'hero' },
  { src: 'hero/Lockers.png', config: 'hero' },
  { src: 'hero/outside3.jpg', config: 'hero' },
  { src: 'hero/outside4.jpg', config: 'hero' },
  { src: 'hero/outside5.PNG', config: 'hero', priority: true },
  { src: 'hero/outside.jpg', config: 'hero' },
  { src: 'hero/outside2.jpg', config: 'hero' },
  { src: 'hero/mat1.jpg', config: 'hero' },
  { src: 'hero/mat2.jpg', config: 'hero' },
  { src: 'hero/mat3ish.jpg', config: 'hero' },
  { src: 'hero/nomats.jpg', config: 'hero' },
  { src: 'hero/1.jpg', config: 'hero' },
  { src: 'hero/texture-overlay.PNG', config: 'overlays' },

  // Overlays - need transparency preserved
  { src: 'overlays/WaterColor.pdf.PNG', config: 'overlays', keepPng: true },
  { src: 'overlays/Circle.pdf.PNG', config: 'overlays', keepPng: true },
  { src: 'overlays/stained-glass.PNG', config: 'overlays', keepPng: true },
  { src: 'overlays/Swirls.PNG', config: 'overlays', keepPng: true },

  // Event images
  { src: 'events/2.JPEG', config: 'events' },
  { src: 'events/katrina/1.jpg', config: 'events' },
  { src: 'events/katrina/2.jpg', config: 'events' },
  { src: 'events/katrina/3.jpg', config: 'events' },
  { src: 'events/katrina/4.jpg', config: 'events' },
];

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function optimizeImage(target) {
  const srcPath = path.join(PUBLIC_DIR, target.src);
  const cfg = config[target.config];

  // Check if source exists
  try {
    await fs.access(srcPath);
  } catch {
    console.log(`⚠️  Skipping ${target.src} - file not found`);
    return null;
  }

  const originalSize = await getFileSize(srcPath);
  const ext = path.extname(target.src).toLowerCase();
  const baseName = path.basename(target.src, ext);
  const dirName = path.dirname(target.src);

  // Create backup directory
  const backupDir = path.join(PUBLIC_DIR, '_originals', dirName);
  await ensureDir(backupDir);

  // Backup original
  const backupPath = path.join(backupDir, path.basename(target.src));
  try {
    await fs.access(backupPath);
    // Backup already exists
  } catch {
    await fs.copyFile(srcPath, backupPath);
    console.log(`📦 Backed up: ${target.src}`);
  }

  // Determine output format
  const isPng = ext === '.png';
  const needsTransparency = target.keepPng || (isPng && target.config === 'overlays');

  // Create optimized version
  let pipeline = sharp(srcPath);

  // Get metadata for smart resizing
  const metadata = await pipeline.metadata();

  // Resize if needed (maintain aspect ratio)
  if (metadata.width > cfg.maxWidth || metadata.height > cfg.maxHeight) {
    pipeline = pipeline.resize(cfg.maxWidth, cfg.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let outputPath;
  let outputSize;

  if (needsTransparency) {
    // Keep as PNG but optimize
    outputPath = srcPath;
    await pipeline
      .png({ quality: cfg.quality, compressionLevel: 9 })
      .toFile(srcPath + '.tmp');
    await fs.rename(srcPath + '.tmp', srcPath);
    outputSize = await getFileSize(srcPath);
  } else {
    // Convert to WebP
    const webpName = baseName + '.webp';
    outputPath = path.join(PUBLIC_DIR, dirName, webpName);

    await pipeline
      .webp({ quality: cfg.quality })
      .toFile(outputPath);

    outputSize = await getFileSize(outputPath);

    // Remove original (we have backup)
    if (outputPath !== srcPath) {
      await fs.unlink(srcPath);
    }
  }

  const savings = ((1 - outputSize / originalSize) * 100).toFixed(1);
  const newExt = needsTransparency ? ext : '.webp';

  console.log(`✅ ${target.src}`);
  console.log(`   ${formatSize(originalSize)} → ${formatSize(outputSize)} (${savings}% smaller)`);

  return {
    original: target.src,
    optimized: path.join(dirName, baseName + newExt),
    originalSize,
    optimizedSize: outputSize,
    savings: parseFloat(savings),
  };
}

async function main() {
  console.log('🖼️  Image Optimization Script\n');
  console.log('=' .repeat(50));

  const results = [];
  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const target of optimizationTargets) {
    try {
      const result = await optimizeImage(target);
      if (result) {
        results.push(result);
        totalOriginal += result.originalSize;
        totalOptimized += result.optimizedSize;
      }
    } catch (error) {
      console.error(`❌ Error optimizing ${target.src}:`, error.message);
    }
    console.log('');
  }

  console.log('=' .repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   Images processed: ${results.length}`);
  console.log(`   Total original: ${formatSize(totalOriginal)}`);
  console.log(`   Total optimized: ${formatSize(totalOptimized)}`);
  console.log(`   Total savings: ${formatSize(totalOriginal - totalOptimized)} (${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%)`);

  // Generate a mapping file for code updates
  const mappingFile = path.join(__dirname, 'image-mapping.json');
  const mapping = {};
  results.forEach(r => {
    if (r.original !== r.optimized) {
      mapping['/' + path.join('images', r.original).replace(/\\/g, '/')] =
        '/' + path.join('images', r.optimized).replace(/\\/g, '/');
    }
  });

  await fs.writeFile(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\n📝 Image mapping saved to: scripts/image-mapping.json`);
  console.log('\nNext steps:');
  console.log('1. Update image paths in your code using the mapping file');
  console.log('2. Original files are backed up in public/images/_originals/');
}

main().catch(console.error);
