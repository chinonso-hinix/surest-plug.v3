import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAllLogoAssets() {
  const sourceImage = 'temp_cleaned_logo.png';
  if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found:', sourceImage);
    process.exit(1);
  }

  // 1. High-resolution master logo with transparent background
  const masterLogo = await sharp(sourceImage)
    .resize(1200, null, { fit: 'inside' })
    .png()
    .toBuffer();

  // 2. Square favicon (with proportional padding so it looks great in browser tabs)
  const favicon512 = await sharp(sourceImage)
    .resize(460, 460, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 26,
      bottom: 26,
      left: 26,
      right: 26,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  const favicon192 = await sharp(favicon512)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const favicon32 = await sharp(favicon512)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const targetDirs = [
    'public',
    'public/assets/images',
    'assets/images',
    'dist',
    'dist/assets/images'
  ];

  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'sp-logo.png'), masterLogo);
    fs.writeFileSync(path.join(dir, 'logo.png'), masterLogo);
    fs.writeFileSync(path.join(dir, 'logo-sp.png'), masterLogo);
    fs.writeFileSync(path.join(dir, 'favicon.png'), favicon512);
    fs.writeFileSync(path.join(dir, 'favicon-192.png'), favicon192);
    fs.writeFileSync(path.join(dir, 'favicon-32.png'), favicon32);
    fs.writeFileSync(path.join(dir, 'favicon.ico'), favicon32);
  }

  console.log('Successfully deployed all logo and favicon assets without white box containers!');
}

generateAllLogoAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
