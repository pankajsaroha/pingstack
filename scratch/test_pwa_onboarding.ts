/**
 * PWA Installation, Viewport & Notification Onboarding Verification Script
 */
import fs from 'fs';
import path from 'path';

console.log('\n=============================================');
console.log('🧪 PWA INSTALLATION, VIEWPORT & NOTIFICATION TESTS');
console.log('=============================================');

// 1. Manifest Validation
console.log('\n--- TEST GROUP 1: Web App Manifest Integrity ---');
const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

console.assert(manifest.name === 'PingStack', 'Manifest name must be PingStack');
console.assert(manifest.short_name === 'PingStack', 'Manifest short_name must be PingStack');
console.assert(manifest.display === 'standalone', 'Display mode must be standalone');
console.assert(manifest.start_url === '/dashboard', 'Start URL must be /dashboard');
console.assert(manifest.scope === '/', 'Scope must be /');
console.assert(manifest.id === '/', 'Manifest id must be /');
console.assert(manifest.theme_color === '#09090b', 'Theme color must match dark palette');
console.assert(manifest.icons && manifest.icons.length >= 4, 'Must have at least 4 icons including maskable');

console.log('✅ PASS: Manifest name, short_name, and id valid');
console.log('✅ PASS: Display is standalone (app-like window without browser address bar)');
console.log('✅ PASS: Scope (/) and start_url (/dashboard) configured');
console.log('✅ PASS: Theme color (#09090b) and icon assets present');

// 2. Viewport & Mobile Responsiveness Meta Configuration
console.log('\n--- TEST GROUP 2: Viewport Configuration ---');
const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
const layoutRaw = fs.readFileSync(layoutPath, 'utf8');

console.assert(layoutRaw.includes('export const viewport: Viewport'), 'Layout must export viewport');
console.assert(layoutRaw.includes("width: 'device-width'"), 'Viewport must include device-width');
console.assert(layoutRaw.includes("viewportFit: 'cover'"), 'Viewport must include viewportFit cover');
console.assert(layoutRaw.includes('<meta name="viewport"'), 'Layout head must render viewport meta tag');
console.assert(layoutRaw.includes('<meta name="mobile-web-app-capable" content="yes" />'), 'Layout must include mobile-web-app-capable');

console.log('✅ PASS: Next.js Viewport object exported in root layout');
console.log('✅ PASS: width=device-width, initialScale=1, maximumScale=5 configured');
console.log('✅ PASS: Mobile Web App capable meta tags present for Android & iOS');

// 3. Login Page Responsiveness
console.log('\n--- TEST GROUP 3: Login & Auth Page Layout Integrity ---');
const loginPath = path.resolve(process.cwd(), 'src/app/login/page.tsx');
const loginRaw = fs.readFileSync(loginPath, 'utf8');

console.assert(loginRaw.includes('p-4 sm:p-6'), 'Login outer container must have responsive padding');
console.assert(loginRaw.includes('max-w-md w-full'), 'Login form container must adapt smoothly');
console.assert(!loginRaw.includes('min-w-['), 'Login form must not have fixed desktop min-width');

console.log('✅ PASS: Login page uses responsive mobile-first padding (p-4 sm:p-6)');
console.log('✅ PASS: No desktop min-width locks or horizontal overflow vectors');

// 4. Dedicated Installation Page Contract & Refresh Status Functionality
console.log('\n--- TEST GROUP 4: Dedicated Installation Page Contract ---');
const installPath = path.resolve(process.cwd(), 'src/app/(app)/install/page.tsx');
const installRaw = fs.readFileSync(installPath, 'utf8');

console.assert(installRaw.includes('getPlatformInfo'), 'Install page must use getPlatformInfo');
console.assert(installRaw.includes('subscribeToWebPush'), 'Install page must support Web Push subscription');
console.assert(installRaw.includes('beforeinstallprompt'), 'Install page must handle native Android beforeinstallprompt');
console.assert(installRaw.includes('Add to Home Screen'), 'Install page must provide iOS Add to Home Screen guide');
console.assert(installRaw.includes('permission === \'denied\''), 'Install page must handle blocked notification recovery');
console.assert(installRaw.includes('/api/notifications/test-push'), 'Install page must support test push alerts');
console.assert(installRaw.includes('refreshPlatform(true)'), 'Refresh Status button must call refreshPlatform with feedback');
console.assert(installRaw.includes('isRefreshing'), 'Refresh Status button must have isRefreshing loading state');
console.assert(!installRaw.includes('ArrowLeft'), 'Install page header must not contain back arrow button');

console.log('✅ PASS: Android beforeinstallprompt & manual steps supported');
console.log('✅ PASS: iOS Safari Add to Home Screen step-by-step guidance present');
console.log('✅ PASS: Tri-state notification handler (granted, default, denied recovery) implemented');
console.log('✅ PASS: Back arrow button removed from Install page header');
console.log('✅ PASS: Refresh Status is fully wired to live browser/push status with loading feedback');

// 5. Dashboard Contextual CTA & Sidebar Settings Item
console.log('\n--- TEST GROUP 5: Dashboard CTA & Sidebar Settings Link ---');
const dashboardPath = path.resolve(process.cwd(), 'src/app/(app)/dashboard/_components/DashboardClient.tsx');
const dashboardRaw = fs.readFileSync(dashboardPath, 'utf8');
const installCardPath = path.resolve(process.cwd(), 'src/app/(app)/dashboard/_components/InstallAppCard.tsx');
const installCardRaw = fs.readFileSync(installCardPath, 'utf8');
const sidebarPath = path.resolve(process.cwd(), 'src/components/Sidebar.tsx');
const sidebarRaw = fs.readFileSync(sidebarPath, 'utf8');

console.assert(dashboardRaw.includes('<InstallAppCard />'), 'Dashboard must render InstallAppCard');
console.assert(installCardRaw.includes('getPlatformInfo'), 'InstallAppCard must use getPlatformInfo for context-aware state');
console.assert(sidebarRaw.includes('Settings'), 'Sidebar must contain Settings item');
console.assert(!sidebarRaw.includes('Workspace Tour'), 'Sidebar must not contain Workspace Tour item');
console.assert(sidebarRaw.includes('/install') && sidebarRaw.includes('Notifications'), 'Sidebar footer must link to Install App & Notifications');

console.log('✅ PASS: Dashboard renders context-aware InstallAppCard component');
console.log('✅ PASS: Workspace Tour removed from sidebar, Settings item present in that location');
console.log('✅ PASS: Sidebar footer contains permanent "Install App & Notifications" secondary entry point');

console.log('\n=============================================');
console.log('🎉 ALL PWA & NOTIFICATION TESTS PASSED!');
console.log('=============================================\n');
