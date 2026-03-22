import { db } from './src/lib/db';

async function debugTemplates() {
  console.log('--- DEBUG: TEMPLATES TABLE ---');
  const { data, error } = await db.from('templates').select('*');
  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No templates found in DB.');
    return;
  }
  
  data.forEach(t => {
    console.log(`ID: ${t.id} | Name: ${t.name} | Language: ${t.language} | ExtID: ${t.template_id} | Status: ${t.status}`);
  });
  console.log('------------------------------');
}

debugTemplates();
