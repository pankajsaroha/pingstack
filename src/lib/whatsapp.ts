export const sendMetaWhatsAppMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  payload: any
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // NORMALIZE: Strip all non-digits (e.g., +, spaces)
        ...payload
      })
    });

    const data = await res.json();

    if (res.ok && data.messages && data.messages.length > 0) {
      return { success: true, messageId: data.messages[0].id };
    } else {
      return { success: false, error: data.error?.message || 'Unknown Meta Cloud API error' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const sendMetaTemplateMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string = 'en_US',
  components: any[] = []
) => {
  return sendMetaWhatsAppMessage(phoneNumberId, accessToken, to, {
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components
    }
  });
};

export const sendMetaTextMessage = async (
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
) => {
  return sendMetaWhatsAppMessage(phoneNumberId, accessToken, to, {
    type: 'text',
    text: { body: text }
  });
};
