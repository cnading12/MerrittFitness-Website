#!/usr/bin/env node
// Analyze and process the venue photo library (public/images/events/venue).
//
// Modes:
//   node scripts/process-venue-images.mjs analyze <previewDir>
//     - For every image: detect letterbox bands (uniform white/black borders),
//       compute the cropped "true" content box and true resolution, and write
//       an 800px preview JPEG (post-crop) for visual review.
//     - Emits JSON analysis to <previewDir>/analysis.json.
//
//   node scripts/process-venue-images.mjs derive <plan.json>
//     - Reads a selection plan (see PlanEntry below) and writes web
//       derivatives. Originals under venue/ are never modified.
//
// PlanEntry: {
//   "source": "public/images/events/venue/wedding/4-church.jpg",
//   "out":    "public/images/pages/weddings/ceremony-hall.webp",
//   "role":   "hero" | "gallery",       // hero: max 2400px, gallery: max 1600px
//   "crop":   [left, top, width, height] // optional, from analyze output
// }

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const VENUE_DIR = 'public/images/events/venue';
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);

// A border row/col counts as letterboxing when nearly all its pixels are
// near-white or near-black and its variance is tiny.
const NEAR_WHITE = 242;
const NEAR_BLACK = 16;
const UNIFORM_FRACTION = 0.97;

async function listImages() {
  const out = [];
  for (const folder of await fs.readdir(VENUE_DIR)) {
    const dir = path.join(VENUE_DIR, folder);
    if (!(await fs.stat(dir)).isDirectory()) continue;
    for (const file of await fs.readdir(dir)) {
      if (IMAGE_EXTS.has(path.extname(file).toLowerCase())) {
        out.push({ folder, file, fullPath: path.join(dir, file) });
      }
    }
  }
  return out;
}

// Scan a downscaled grayscale copy for uniform border bands; return the crop
// box in original-image coordinates, or null when nothing needs cropping.
async function detectLetterbox(fullPath, width, height) {
  const scale = Math.min(1, 640 / Math.max(width, height));
  const w = Math.max(8, Math.round(width * scale));
  const h = Math.max(8, Math.round(height * scale));
  const raw = await sharp(fullPath)
    .rotate() // apply EXIF orientation so the box matches the rendered image
    .resize(w, h, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  const rowUniform = (y) => {
    let extreme = 0;
    for (let x = 0; x < w; x++) {
      const v = raw[y * w + x];
      if (v >= NEAR_WHITE || v <= NEAR_BLACK) extreme++;
    }
    return extreme / w >= UNIFORM_FRACTION;
  };
  const colUniform = (x) => {
    let extreme = 0;
    for (let y = 0; y < h; y++) {
      const v = raw[y * w + x];
      if (v >= NEAR_WHITE || v <= NEAR_BLACK) extreme++;
    }
    return extreme / h >= UNIFORM_FRACTION;
  };

  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  while (top < h / 2 && rowUniform(top)) top++;
  while (bottom > h / 2 && rowUniform(bottom)) bottom--;
  while (left < w / 2 && colUniform(left)) left++;
  while (right > w / 2 && colUniform(right)) right--;

  if (top === 0 && left === 0 && bottom === h - 1 && right === w - 1) return null;

  // Map back to original coordinates with a small inset so anti-aliased band
  // edges don't survive the crop.
  const inset = 2 / scale;
  const cropLeft = Math.max(0, Math.round(left / scale + (left > 0 ? inset : 0)));
  const cropTop = Math.max(0, Math.round(top / scale + (top > 0 ? inset : 0)));
  const cropRight = Math.min(width, Math.round((right + 1) / scale - (right < w - 1 ? inset : 0)));
  const cropBottom = Math.min(height, Math.round((bottom + 1) / scale - (bottom < h - 1 ? inset : 0)));
  const cw = cropRight - cropLeft;
  const ch = cropBottom - cropTop;
  if (cw <= 0 || ch <= 0) return null;
  // Ignore trivial trims under 1.5% of each dimension.
  if (cw > width * 0.985 && ch > height * 0.985) return null;
  return [cropLeft, cropTop, cw, ch];
}

async function analyze(previewDir) {
  await fs.mkdir(previewDir, { recursive: true });
  const results = [];
  for (const entry of await listImages()) {
    const record = { folder: entry.folder, file: entry.file, path: entry.fullPath };
    try {
      const meta = await sharp(entry.fullPath).metadata();
      // Dimensions as rendered (EXIF orientation applied).
      const swap = (meta.orientation || 1) >= 5;
      record.width = swap ? meta.height : meta.width;
      record.height = swap ? meta.width : meta.height;
      record.format = meta.format;
      record.bytes = (await fs.stat(entry.fullPath)).size;

      const crop = await detectLetterbox(entry.fullPath, record.width, record.height);
      record.crop = crop;
      record.trueWidth = crop ? crop[2] : record.width;
      record.trueHeight = crop ? crop[3] : record.height;
      record.trueLongEdge = Math.max(record.trueWidth, record.trueHeight);
      record.heroEligible = record.trueLongEdge >= 1200;

      const previewFolder = path.join(previewDir, entry.folder);
      await fs.mkdir(previewFolder, { recursive: true });
      const previewPath = path.join(previewFolder, `${path.parse(entry.file).name}.jpg`);
      let pipeline = sharp(entry.fullPath).rotate();
      if (crop) pipeline = pipeline.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
      await pipeline.resize(800, 800, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(previewPath);
      record.preview = previewPath;
    } catch (err) {
      record.error = err.message;
    }
    results.push(record);
    console.log(`${record.error ? '✗' : '✓'} ${entry.folder}/${entry.file}` +
      (record.error ? `  ERROR: ${record.error}` : `  ${record.width}x${record.height}` +
        (record.crop ? ` -> true ${record.trueWidth}x${record.trueHeight} (letterbox cropped)` : '')));
  }
  const outPath = path.join(previewDir, 'analysis.json');
  await fs.writeFile(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${outPath} (${results.length} images)`);
}

async function derive(planPath) {
  const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
  for (const item of plan) {
    const maxEdge = item.role === 'hero' ? 2400 : 1600;
    await fs.mkdir(path.dirname(item.out), { recursive: true });
    let pipeline = sharp(item.source).rotate();
    if (item.crop) {
      pipeline = pipeline.extract({ left: item.crop[0], top: item.crop[1], width: item.crop[2], height: item.crop[3] });
    }
    // Never upscale (withoutEnlargement).
    pipeline = pipeline.resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true });

    // Walk quality down until the derivative is under budget.
    const budget = item.role === 'hero' ? 350 * 1024 : 200 * 1024;
    let quality = 80;
    let info;
    for (;;) {
      info = await pipeline.clone().webp({ quality }).toFile(item.out);
      if (info.size <= budget || quality <= 45) break;
      quality -= 10;
    }
    console.log(`✓ ${item.out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB (q${quality})`);
  }
}

const [mode, arg] = process.argv.slice(2);
if (mode === 'analyze') await analyze(arg || 'venue-previews');
else if (mode === 'derive') await derive(arg);
else {
  console.error('Usage: process-venue-images.mjs analyze <previewDir> | derive <plan.json>');
  process.exit(1);
}
