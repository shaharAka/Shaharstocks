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

export interface PayPalTransaction {
  id: string;
  status: string;
  amount_with_breakdown: {
    gross_amount: {
      currency_code: string;
      value: string;
    };
    fee_amount?: {
      currency_code: string;
      value: string;
    };
    net_amount?: {
      currency_code: string;
      value: string;
    };
  };
  payer_email?: string;
  payer_name?: {
    given_name?: string;
    surname?: string;
  };
  time: string;
}

export interface PayPalTransactionsResponse {
  transactions: PayPalTransaction[];
  links?: Array<{ href: string; rel: string; method: string }>;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function generatePayPalAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

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
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
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

export async function cancelPayPalSubscription(
  subscriptionId: string, 
  reason: string = 'Account closed by administrator'
): Promise<{ success: boolean; error?: string }> {
  if (!subscriptionId || subscriptionId === 'manual_activation') {
    console.log('[PayPal] Skipping cancellation for non-PayPal subscription:', subscriptionId);
    return { success: true };
  }

  try {
    const accessToken = await generatePayPalAccessToken();

    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (response.status === 204) {
      console.log(`[PayPal] Successfully cancelled subscription: ${subscriptionId}`);
      return { success: true };
    }

    if (response.status === 422) {
      const errorData = await response.json();
      if (errorData.details?.[0]?.issue === 'SUBSCRIPTION_STATUS_INVALID') {
        console.log(`[PayPal] Subscription already cancelled or invalid: ${subscriptionId}`);
        return { success: true };
      }
    }

    const errorData = await response.json().catch(() => ({}));
    console.error(`[PayPal] Failed to cancel subscription ${subscriptionId}:`, errorData);
    return { 
      success: false, 
      error: errorData.message || `HTTP ${response.status}` 
    };
  } catch (error) {
    console.error('[PayPal] Cancel subscription error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getSubscriptionTransactions(
  subscriptionId: string,
  startTime?: string,
  endTime?: string
): Promise<{ success: boolean; transactions?: PayPalTransaction[]; error?: string }> {
  if (!subscriptionId || subscriptionId === 'manual_activation') {
    return { success: true, transactions: [] };
  }

  try {
    const accessToken = await generatePayPalAccessToken();

    const now = new Date();
    const defaultEndTime = now.toISOString();
    const defaultStartTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      start_time: startTime || defaultStartTime,
      end_time: endTime || defaultEndTime,
    });

    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/transactions?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[PayPal] Failed to get transactions for ${subscriptionId}:`, errorData);
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    const data: PayPalTransactionsResponse = await response.json();
    console.log(`[PayPal] Retrieved ${data.transactions?.length || 0} transactions for ${subscriptionId}`);
    
    return { 
      success: true, 
      transactions: data.transactions || [] 
    };
  } catch (error) {
    console.error('[PayPal] Get transactions error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getSubscriptionDetails(subscriptionId: string): Promise<{ 
  success: boolean; 
  subscription?: any; 
  error?: string 
}> {
  if (!subscriptionId || subscriptionId === 'manual_activation') {
    return { success: false, error: 'No valid subscription ID' };
  }

  try {
    const accessToken = await generatePayPalAccessToken();

    const response = await fetch(
      `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    const data = await response.json();
    return { success: true, subscription: data };
  } catch (error) {
    console.error('[PayPal] Get subscription details error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
