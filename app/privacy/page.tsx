import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "QRZMail Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="stack" style={{ maxWidth: "720px", margin: "0 auto" }}>
      <section>
        <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "8px" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: "14px", marginBottom: "32px" }}>
          Last updated: June 24, 2026
        </p>

        <div style={{ display: "grid", gap: "24px", color: "var(--ink-soft)", lineHeight: "1.7" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>1. Information We Collect</h2>
            <p>
              When you create an account, we collect your email address and a securely hashed password.
              If you add a custom domain, we store the domain name and associated DNS records required
              to deliver email (SPF, DKIM, DMARC).
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>2. How We Use Your Information</h2>
            <p>
              We use your information solely to provide and maintain the QRZMail email hosting service:
              delivering email to your mailbox, authenticating your identity, and enabling domain
              management features. We do not sell, rent, or share your personal data with third parties
              for their own marketing purposes.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>3. Data Storage & Security</h2>
            <p>
              Email content is stored on our secure servers and is encrypted in transit using TLS.
              Passwords are hashed using PBKDF2 with 120,000 iterations. We implement industry-standard
              security measures to protect your data against unauthorized access.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>4. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your
              account, we will remove your personal data within 30 days. Email content may be retained
              in backups for up to 90 days.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>5. Cookies</h2>
            <p>
              We use essential session cookies to maintain your login state. No tracking cookies,
              analytics cookies, or third-party cookies are used on this service.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>6. Third-Party Services</h2>
            <p>
              QRZMail uses Mailcow and SOGo as underlying email platform components. These are
              self-hosted on our infrastructure. No third-party email processing services are involved.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data at any time.
              To exercise these rights, contact us at <a href="mailto:admin@qrzmail.com" className="text-link">admin@qrzmail.com</a>.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>8. Contact</h2>
            <p>
              For any questions about this privacy policy, please contact us at{" "}
              <a href="mailto:admin@qrzmail.com" className="text-link">admin@qrzmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
