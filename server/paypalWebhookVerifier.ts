interface WebhookVerificationRequest {
  webhookId: string;
  headers: {
    'paypal-transmission-sig': string;
    'paypal-cert-url': string;
    'paypal-transmission-id': string;
    'paypal-transmission-time': string;
    'paypal-auth-algo': string;
  };
  body: any;
}

async function generatePayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function verifyPayPalWebhook(request: WebhookVerificationRequest): Promise<boolean> {
  try {
    const accessToken = await generatePayPalAccessToken();

    const verificationPayload = {
      auth_algo: request.headers['paypal-auth-algo'],
      cert_url: request.headers['paypal-cert-url'],
      transmission_id: request.headers['paypal-transmission-id'],
      transmission_sig: request.headers['paypal-transmission-sig'],
      transmission_time: request.headers['paypal-transmission-time'],
      webhook_id: request.webhookId,
      webhook_event: request.body,
    };

    const response = await fetch(
      'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(verificationPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[PayPal Webhook Verification] API Error:', errorData);
      return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('[PayPal Webhook Verification] Error:', error);
    return false;
  }
}
