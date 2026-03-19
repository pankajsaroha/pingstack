const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY || '';
const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME || '';

export const sendWhatsAppMessage = async (
  phone: string, 
  templateId: string, 
  params: any[]
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const url = 'https://api.gupshup.io/wa/api/v1/template/msg';
  
  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER || '917834811114',
    destination: phone,
    'src.name': GUPSHUP_APP_NAME,
    template: JSON.stringify({
      id: templateId,
      params: params
    })
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': GUPSHUP_API_KEY
      },
      body: payload.toString()
    });

    const data = await res.json();
    
    if (res.ok && data.status === 'submitted') {
      return { success: true, messageId: data.messageId };
    } else {
      return { success: false, error: data.message || 'Unknown Gupshup error' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
