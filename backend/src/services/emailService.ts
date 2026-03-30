import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "StaffVerify <noreply@staffverify.com>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3010";

interface SendEmailParams {
  to: string;
  subject: string;
  body?: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  messageId: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  html,
}: SendEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Email queued (RESEND_API_KEY not set):", {
      to,
      subject,
      preview: body?.substring(0, 100),
    });
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: html || body || "",
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { success: true, messageId: data?.id || `resend-${Date.now()}` };
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<EmailResult> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #00207f; font-size: 24px; margin: 0;">StaffVerify</h1>
            </div>

            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px;">Reset your password</h2>

            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: white; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px;">
                Reset Password
              </a>
            </div>

            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
              If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Reset your StaffVerify password",
    html,
  });
}

interface InvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  disputeWindowHours: number;
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  clientName,
  totalAmount,
  periodStart,
  periodEnd,
  disputeWindowHours,
}: InvoiceEmailParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} - Billing Period ${periodStart} to ${periodEnd}`,
    body: `Dear ${clientName},

Your invoice for the billing period ${periodStart} to ${periodEnd} is ready.

Total Due: $${totalAmount.toFixed(2)}

You have ${disputeWindowHours} hours to dispute this invoice before automatic payment is processed.

If you have any questions, please contact your account manager.

StaffVerify Finance Team`,
  });
}

interface PaymentConfirmationParams {
  to: string;
  invoiceNumber: string;
  totalAmount: number;
  clientName: string;
}

export async function sendPaymentConfirmationEmail({
  to,
  invoiceNumber,
  totalAmount,
  clientName,
}: PaymentConfirmationParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Payment Confirmed - Invoice ${invoiceNumber}`,
    body: `Dear ${clientName},

Your payment of $${totalAmount.toFixed(2)} for invoice ${invoiceNumber} has been successfully processed.

Thank you for your business.

StaffVerify Finance Team`,
  });
}

interface PaymentFailedParams {
  to: string;
  invoiceNumber: string;
  totalAmount: number;
  _clientName?: string;
}

export async function sendPaymentFailedEmail({
  to,
  invoiceNumber,
  totalAmount,
  _clientName,
}: PaymentFailedParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Payment Failed - Invoice ${invoiceNumber}`,
    body: `We were unable to process your payment of $${totalAmount.toFixed(2)} for invoice ${invoiceNumber}.

Please update your payment method at your earliest convenience.

A retry will be attempted in 48 hours.

StaffVerify Finance Team`,
  });
}

interface QueueAlertParams {
  to: string;
  jobId: string;
  jobType: string;
  payerName: string;
  queueSize: number;
}

export async function sendQueueAlertEmail({
  to,
  jobId,
  jobType,
  payerName,
  queueSize,
}: QueueAlertParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Automation Queue Alert — Over 20 Jobs Pending",
    body: `The browser automation queue has exceeded ${queueSize} pending jobs. For urgent cases, consider manual portal submission.

Job queued: ${jobId} | Type: ${jobType} | Payer: ${payerName}`,
  });
}
