import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTest() {
  const { hashApiKey } = await import('../src/lib/api-auth');
  console.log('--- Testing API Authentication Hashing ---');
  const mockPlaintext = 'ps_secret_live_a1b2c3d4e5f6g7h8i9j0';
  const hashed = hashApiKey(mockPlaintext);
  
  console.log('Plaintext API Key:', mockPlaintext);
  console.log('SHA-256 Hash string:', hashed);

  if (hashed.length === 64) {
    console.log('✅ Hash matches standard SHA-256 output length (64 characters).');
  } else {
    console.log('❌ Unexpected hash size:', hashed.length);
  }
}

runTest().catch(console.error);
