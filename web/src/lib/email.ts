/**
 * Email utility for sending transactional emails via Mailgun.
 *
 * Uses Mailgun's REST API directly to avoid additional dependencies.
 * Configured for EU region (api.eu.mailgun.net).
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
}

/**
 * Send an email via Mailgun API.
 *
 * @throws Error if Mailgun credentials are not configured or API call fails
 */
export async function sendEmail({ to, subject, text }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM || `Knowsee <noreply@${domain}>`;

  if (!apiKey || !domain) {
    throw new Error("Mailgun credentials not configured");
  }

  const response = await fetch(`https://api.eu.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      from,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

/**
 * Send OTP verification email.
 *
 * @param email - Recipient email address
 * @param otp - The one-time password to send
 */
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Your Knowsee verification code",
    text: `Your Knowsee verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  });
}
