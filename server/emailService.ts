// Resend integration for email verification - uses GCP Secret Manager for secure API key management
import { Resend } from 'resend';

// Get Resend API key from environment variable (should be set from GCP Secret Manager)
function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set. Please configure it in GCP Secret Manager.');
  }
  return apiKey;
}

function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableResendClient() {
  const apiKey = getResendApiKey();
  const fromEmail = getResendFromEmail();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail
  };
}

interface VerificationEmailParams {
  to: string;
  name: string;
  verificationUrl: string;
}

export async function sendVerificationEmail({ to, name, verificationUrl }: VerificationEmailParams): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: to,
      subject: 'Verify your email - signal2',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">signal2</h1>
                        <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Stock Analysis Platform</p>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">Welcome, ${name}!</h2>
                        <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                          Thank you for signing up. To get started with your 30-day free trial, please verify your email address by clicking the button below.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                        </p>
                        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                          This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #6b7280; font-size: 13px;">
                          &copy; ${new Date().getFullYear()} signal2. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EmailService] Failed to send verification email:', error);
      return false;
    }

    console.log('[EmailService] Verification email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending verification email:', error);
    return false;
  }
}

interface AdminNotificationParams {
  adminEmails: string[];
  userName: string;
  userEmail: string;
  signupMethod: 'email' | 'google';
}

export async function notifySuperAdminsNewSignup({ adminEmails, userName, userEmail, signupMethod }: AdminNotificationParams): Promise<boolean> {
  if (adminEmails.length === 0) {
    console.log('[EmailService] No super admins to notify');
    return true;
  }

  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New User Signup - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">New User Signup</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">A new user has signed up for signal2:</p>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Signup Method:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${signupMethod === 'google' ? 'Google OAuth' : 'Email/Password'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${new Date().toLocaleString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EmailService] Failed to send admin signup notification:', error);
      return false;
    }

    console.log('[EmailService] Admin signup notification sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending admin signup notification:', error);
    return false;
  }
}

interface BugReportParams {
  subject: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  url: string;
  userAgent: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendBugReport({ subject, description, reporterName, reporterEmail, url, userAgent }: BugReportParams): Promise<boolean> {
  const recipientEmail = "shaharro@gmail.com";
  
  // Escape all user-provided content to prevent HTML injection
  const safeSubject = escapeHtml(subject);
  const safeDescription = escapeHtml(description);
  const safeName = escapeHtml(reporterName);
  const safeUrl = escapeHtml(url);
  const safeUserAgent = escapeHtml(userAgent);
  
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: recipientEmail,
      replyTo: reporterEmail,
      subject: `[Bug Report] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">Bug Report</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <h2 style="margin: 0 0 16px; color: #111827; font-size: 18px;">${safeSubject}</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">From:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeName} (${reporterEmail})</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Page URL:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; word-break: break-all;">${safeUrl}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${new Date().toLocaleString()}</td>
                          </tr>
                        </table>
                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                          <h3 style="margin: 0 0 8px; color: #374151; font-size: 14px; font-weight: 600;">Description:</h3>
                          <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeDescription}</p>
                        </div>
                        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 12px; font-size: 12px; color: #6b7280;">
                          <strong>User Agent:</strong><br>
                          ${safeUserAgent}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EmailService] Failed to send bug report:', error);
      return false;
    }

    console.log('[EmailService] Bug report sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending bug report:', error);
    return false;
  }
}

interface PaymentNotificationParams {
  adminEmails: string[];
  userName: string;
  userEmail: string;
  amount: string;
  subscriptionId: string;
}

export async function notifySuperAdminsFirstPayment({ adminEmails, userName, userEmail, amount, subscriptionId }: PaymentNotificationParams): Promise<boolean> {
  if (adminEmails.length === 0) {
    console.log('[EmailService] No super admins to notify');
    return true;
  }

  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New Paying Customer - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 20px;">New Paying Customer!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">A user has made their first payment:</p>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${userEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                            <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600;">${amount}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subscription ID:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${subscriptionId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${new Date().toLocaleString()}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[EmailService] Failed to send admin payment notification:', error);
      return false;
    }

    console.log('[EmailService] Admin payment notification sent:', data?.id);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending admin payment notification:', error);
    return false;
  }
}
