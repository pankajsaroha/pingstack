import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('.env.local NOT FOUND at:', envPath);
} else {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File Content Length:', content.length);
  const lines = content.split('\n');
  console.log('Total Lines:', lines.length);
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.includes('RESEND')) {
      console.log(`Line ${index + 1} matches RESEND: [${line}]`);
      console.log(`Character codes for this line:`, [...line].map(c => c.charCodeAt(0)));
    }
  });
  
  // Also check if any other keys look similar
  const keys = lines.map(l => l.split('=')[0].trim()).filter(k => k.length > 0);
  console.log('All Keys Found:', keys);
}
