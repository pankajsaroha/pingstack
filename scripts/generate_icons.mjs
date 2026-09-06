import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const brandGreen = '#16a34a'; // Rich, saturated, darker green

// Standard SVG with white background and balanced padding (10-15% smaller inner mark)
function createSvg(size, paddingRatio = 0.21) {
  const innerSize = size * (1 - paddingRatio * 2);
  const scale = innerSize / 24;
  const offset = size * paddingRatio;
  const strokeWidth = 1.9;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <g transform="translate(${offset}, ${offset}) scale(${scale})">
    <path 
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
      fill="none" 
      stroke="${brandGreen}" 
      stroke-width="${strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>`;
}

// Favicon SVG (32x32) with subtle rounded corner rect and balanced scale
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#ffffff"/>
  <rect width="30" height="30" x="1" y="1" rx="6" fill="none" stroke="#e4e4e7" stroke-width="1"/>
  <g transform="translate(4.8, 4.8) scale(0.93)">
    <path 
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
      fill="none" 
      stroke="${brandGreen}" 
      stroke-width="2.1" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    />
  </g>
</svg>`;

async function generate() {
  fs.writeFileSync('public/icon.svg', faviconSvg);
  fs.writeFileSync('src/app/icon.svg', faviconSvg);
  fs.writeFileSync('public/icons/icon.svg', createSvg(512, 0.21));

  // 192x192
  await sharp(Buffer.from(createSvg(192, 0.21)))
    .png()
    .toFile('public/icons/icon-192x192.png');

  // 512x512
  await sharp(Buffer.from(createSvg(512, 0.21)))
    .png()
    .toFile('public/icons/icon-512x512.png');

  // Maskable 192x192 (with 25% safe zone padding for Android circular/squircle mask)
  await sharp(Buffer.from(createSvg(192, 0.25)))
    .png()
    .toFile('public/icons/icon-maskable-192x192.png');

  // Maskable 512x512
  await sharp(Buffer.from(createSvg(512, 0.25)))
    .png()
    .toFile('public/icons/icon-maskable-512x512.png');

  // Apple touch icon (180x180) in public root, public/icons, and src/app/apple-icon.png
  const appleIconBuffer = await sharp(Buffer.from(createSvg(180, 0.21)))
    .png()
    .toBuffer();

  fs.writeFileSync('public/apple-touch-icon.png', appleIconBuffer);
  fs.writeFileSync('public/icons/apple-touch-icon.png', appleIconBuffer);
  fs.writeFileSync('src/app/apple-icon.png', appleIconBuffer);

  console.log('All PingStack PWA icons successfully generated with refined scale and darker green (' + brandGreen + ')!');
}

generate().catch(console.error);

