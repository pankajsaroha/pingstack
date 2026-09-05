const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// 1. Standard PingStack Icon SVG (512x512 with brand styling)
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect width="510" height="510" x="1" y="1" rx="111" fill="none" stroke="#27272a" stroke-width="2" opacity="0.6"/>

  <!-- WhatsApp / PingStack Chat Glyph -->
  <g filter="url(#shadow)">
    <!-- 3 Message Dots -->
    <circle cx="180" cy="256" r="16" fill="#34d399"/>
    <circle cx="256" cy="256" r="16" fill="#34d399"/>
    <circle cx="332" cy="256" r="16" fill="#34d399"/>

    <!-- Chat Bubble Outer Stroke -->
    <path 
      d="M390 256c0 66.274-60.45 120-135 120a147.95 147.95 0 01-63.825-14.235L105 380l20.925-55.8C112.68 304.63 105 281.61 105 256c0-66.274 60.45-120 135-120s135 53.726 135 120z" 
      fill="none" 
      stroke="url(#emeraldGrad)" 
      stroke-width="28" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

// 2. Maskable SVG (Full-bleed dark background with 80% safe-zone scaled icon)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="emeraldGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Android adaptive launcher -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>

  <!-- Centered Scaled Icon in 80% Safe Zone (scale 0.72) -->
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <circle cx="180" cy="256" r="16" fill="#34d399"/>
    <circle cx="256" cy="256" r="16" fill="#34d399"/>
    <circle cx="332" cy="256" r="16" fill="#34d399"/>

    <path 
      d="M390 256c0 66.274-60.45 120-135 120a147.95 147.95 0 01-63.825-14.235L105 380l20.925-55.8C112.68 304.63 105 281.61 105 256c0-66.274 60.45-120 135-120s135 53.726 135 120z" 
      fill="none" 
      stroke="url(#emeraldGradMask)" 
      stroke-width="28" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>
`;

async function main() {
  console.log('Generating high-resolution PWA icons...');

  // 512x512 Standard
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512x512.png'));

  // 192x192 Standard
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192x192.png'));

  // 512x512 Maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512x512.png'));

  // 192x192 Maskable
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-192x192.png'));

  // Apple Touch Icon 180x180 (In /icons and in root /public for Safari default crawler)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // Also write SVG source
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), standardSvg);

  console.log('✅ All PWA icons generated successfully:');
  console.log(' - public/icons/icon-192x192.png');
  console.log(' - public/icons/icon-512x512.png');
  console.log(' - public/icons/icon-maskable-192x192.png');
  console.log(' - public/icons/icon-maskable-512x512.png');
  console.log(' - public/icons/apple-touch-icon.png');
  console.log(' - public/apple-touch-icon.png');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
