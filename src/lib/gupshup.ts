export const sendWhatsAppMessage = async (
  phone: string, 
  templateId: string, 
  params: any[],
  appName: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const url = 'https://api.gupshup.io/wa/api/v1/template/msg';
  
  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER || '917834811114',
    destination: phone,
    'src.name': appName,
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
        'apikey': apiKey
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

export const sendWhatsAppTextMessage = async (
  phone: string, 
  text: string, 
  appName: string,
  apiKey: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const url = 'https://api.gupshup.io/wa/api/v1/msg';
  
  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source: process.env.GUPSHUP_PHONE_NUMBER || '917834811114',
    destination: phone,
    'src.name': appName,
    message: JSON.stringify({
      type: 'text',
      text: text
    })
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': apiKey
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
