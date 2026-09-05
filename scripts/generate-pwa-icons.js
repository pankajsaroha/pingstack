const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Official PingStack SVG path on standard 24x24 grid
const PINGSTACK_PATH = "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z";

// 1. Standard PingStack Icon SVG (512x512, Pure White Background, Brand Emerald Green #10b981)
const standardWhiteSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Clean Crisp White Background -->
  <rect width="512" height="512" rx="108" fill="#ffffff"/>
  <rect width="510" height="510" x="1" y="1" rx="107" fill="none" stroke="#e4e4e7" stroke-width="2"/>

  <!-- Centered Official PingStack Logo (24x24 grid scaled up by 15.5x with generous safe padding) -->
  <g transform="translate(70, 70) scale(15.5)">
    <path 
      d="${PINGSTACK_PATH}" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

// 2. Apple Touch Icon (180x180 square white background - iOS handles rounding automatically)
const appleTouchSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="#ffffff"/>
  <g transform="translate(25, 25) scale(5.416)">
    <path 
      d="${PINGSTACK_PATH}" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

// 3. Maskable SVG (Full-bleed white background with 70% safe zone for Android launcher shapes)
const maskableWhiteSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff"/>
  <g transform="translate(106, 106) scale(12.5)">
    <path 
      d="${PINGSTACK_PATH}" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

// 4. Clean 32x32 Favicon / Icon SVG
const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#ffffff"/>
  <rect width="30" height="30" x="1" y="1" rx="6" fill="none" stroke="#e4e4e7" stroke-width="1"/>
  <g transform="translate(4, 4) scale(1)">
    <path 
      d="${PINGSTACK_PATH}" 
      fill="none" 
      stroke="#10b981" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

async function main() {
  console.log('Generating official PingStack white-background PWA icons...');

  // 512x512 Standard PNG
  await sharp(Buffer.from(standardWhiteSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512x512.png'));

  // 192x192 Standard PNG
  await sharp(Buffer.from(standardWhiteSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192x192.png'));

  // 512x512 Maskable PNG
  await sharp(Buffer.from(maskableWhiteSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512x512.png'));

  // 192x192 Maskable PNG
  await sharp(Buffer.from(maskableWhiteSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-192x192.png'));

  // 180x180 Apple Touch Icon PNG
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // Write SVGs
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), standardWhiteSvg);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), faviconSvg);

  console.log('✅ Generated all PingStack brand PWA icons successfully with white background & official green logo.');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
