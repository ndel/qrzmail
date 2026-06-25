import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "postfix-mailcow";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || '"QRZMail Support" <noreply@qrzmail.com>';

function createTransporter() {
  const smtpOptions: Record<string, unknown> = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ignoreTLS: SMTP_PORT !== 465 && !SMTP_USER,
  };

  if (SMTP_USER && SMTP_PASS) {
    smtpOptions.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  return nodemailer.createTransport(smtpOptions);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text.replace(/\n/g, "<br>"),
  });
}
