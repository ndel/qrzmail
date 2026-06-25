import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "QRZMail Terms of Service — rules and guidelines for using the QRZMail email hosting service.",
};

export default function TermsPage() {
  return (
    <div className="stack" style={{ maxWidth: "720px", margin: "0 auto" }}>
      <section>
        <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "8px" }}>
          Terms of Service
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", marginBottom: "32px" }}>
          Last updated: June 24, 2026
        </p>

        <div style={{ display: "grid", gap: "24px", color: "var(--ink-soft)", lineHeight: "1.7" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>1. Acceptance of Terms</h2>
            <p>
              By creating an account or using QRZMail (&ldquo;the Service&rdquo;), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>2. Account Registration</h2>
            <p>
              You must provide a valid email address and secure password to create an account. You are
              responsible for maintaining the confidentiality of your login credentials and for all
              activities that occur under your account.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>3. Acceptable Use</h2>
            <p>
              You agree not to use the Service for:
            </p>
            <ul style={{ marginTop: "8px", paddingLeft: "20px", display: "grid", gap: "4px" }}>
              <li>Sending spam, unsolicited bulk email, or malicious content</li>
              <li>Engaging in illegal activities or violating applicable laws</li>
              <li>Impersonating others or misrepresenting your identity</li>
              <li>Interfering with the operation or security of the Service</li>
              <li>Hosting or distributing malware, phishing content, or harmful software</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>4. Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee 100% uptime. We reserve the
              right to perform maintenance, updates, or modifications that may temporarily affect
              availability. We are not liable for any losses resulting from service interruptions.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>5. Limitation of Liability</h2>
            <p>
              QRZMail is provided &ldquo;as is&rdquo; without warranty of any kind. In no event shall QRZMail be
              liable for any damages arising from the use or inability to use the Service, including
              but not limited to loss of data, loss of business, or interruption of service.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms, engage
              in abusive behavior, or pose a security risk to the Service. You may delete your account
              at any time by contacting us.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>7. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the new terms. We will notify users of material changes via
              email.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>8. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a href="mailto:admin@qrzmail.com" className="text-link">admin@qrzmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
