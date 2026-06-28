import nodemailer from "nodemailer";
import db from "@/lib/db";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

export function getSmtpConfig(providerId: string): SmtpConfig | null {
  const row = db
    .prepare("SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure FROM marketing_providers WHERE id = ?")
    .get(providerId) as any;
  if (!row) return null;
  return {
    host: row.smtp_host,
    port: row.smtp_port,
    user: row.smtp_user,
    pass: row.smtp_pass,
    secure: row.smtp_secure === 1,
  };
}

export function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function verifySmtpConnection(
  providerId: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const config = getSmtpConfig(providerId);
  if (!config) return { success: false, message: "", error: "SMTP provider not found" };

  const transporter = createTransport(config);
  try {
    await transporter.verify();
    return { success: true, message: `Successfully connected to ${config.host}:${config.port}` };
  } catch (err: any) {
    return { success: false, message: "", error: `Connection failed: ${err.message}` };
  } finally {
    transporter.close();
  }
}

export async function sendEmail(
  providerId: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text?: string,
  headers?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getSmtpConfig(providerId);
  if (!config) return { success: false, error: "SMTP provider not found" };

  const transporter = createTransport(config);
  try {
    const info = await transporter.sendMail({
      from, to, subject, html,
      text: text || undefined,
      headers: headers || {},
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
