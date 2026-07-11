import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal-layout';
import { siteHost } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Deelo collects, uses, and protects your data.',
};

const UPDATED = 'July 6, 2026';

export default function PrivacyPage() {
  const host = siteHost();

  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED}>
      <LegalSection title="1. Overview">
        <p>
          This Privacy Policy explains how Deelo (&quot;we,&quot; &quot;us&quot;) collects, uses, and shares information when you
          use our Discord bot, website, and dashboard (collectively, the &quot;Service&quot;). By using the Service, you
          agree to the practices described here.
        </p>
        <p>
          Deelo is a Discord bot operated at {host}. We process data to provide bot features,
          server configuration, moderation tools, and premium subscriptions.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <h3>Discord account information</h3>
        <p>When you log into the dashboard via Discord OAuth, we receive:</p>
        <ul>
          <li>Discord user ID, username, and avatar</li>
          <li>List of servers (guilds) you belong to and your permissions in each</li>
          <li>OAuth tokens stored securely to maintain your session and refresh access when needed</li>
          <li>
            With your consent (via the <code>guilds.join</code> OAuth scope), we may add you to the official Deelo
            Discord community server for support and announcements
          </li>
        </ul>

        <h3>Server &amp; bot configuration data</h3>
        <p>When Deelo is used in a Discord server, we may store:</p>
        <ul>
          <li>Guild ID, settings, prefixes, and feature toggles</li>
          <li>Welcome/goodbye messages, automod filters, auto-responders, and reaction triggers</li>
          <li>Moderation cases, warnings, tickets, level/XP data, and related logs</li>
          <li>Music queue state, voice channel settings, and other configured modules</li>
        </ul>

        <h3>Usage &amp; technical data</h3>
        <ul>
          <li>Command usage and event data needed to operate bot features</li>
          <li>IP address, browser type, and device information when you visit our website</li>
          <li>Session cookies and authentication tokens for the dashboard and admin panel</li>
          <li>Payment and subscription metadata (plan tier, status, expiration) — we do not store full card numbers</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Information">
        <p>We use collected information to:</p>
        <ul>
          <li>Operate, maintain, and improve the Service</li>
          <li>Authenticate dashboard users and enforce server-level permissions</li>
          <li>Sync bot settings between the dashboard and Discord servers</li>
          <li>Provide moderation, leveling, ticketing, music, and other bot features</li>
          <li>Process subscriptions, redeem codes, and premium access</li>
          <li>Detect abuse, fraud, and security incidents</li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Legal Bases (EEA/UK Users)">
        <p>Where applicable, we process personal data based on:</p>
        <ul>
          <li><strong>Contract</strong> — to provide the Service you or your server requested</li>
          <li><strong>Legitimate interests</strong> — security, analytics, and service improvement</li>
          <li><strong>Consent</strong> — where required, such as optional integrations</li>
          <li><strong>Legal obligation</strong> — when we must retain or disclose data by law</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How We Share Information">
        <p>We do not sell your personal information. We may share data with:</p>
        <ul>
          <li><strong>Discord</strong> — as required for bot and OAuth functionality</li>
          <li><strong>Infrastructure providers</strong> — such as hosting and database services (e.g., Supabase) under contractual safeguards</li>
          <li><strong>Payment processors</strong> — if you purchase Premium, subject to their privacy policies</li>
          <li><strong>Legal authorities</strong> — when required by law or to protect rights and safety</li>
        </ul>
        <p>
          Server administrators who configure Deelo may access moderation logs, ticket data, and settings for
          servers they manage through the dashboard.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>
          We retain information for as long as needed to provide the Service and fulfill the purposes described
          in this policy. Guild data may persist while Deelo remains in a server. If the bot is removed, we may
          delete or anonymize server data after a reasonable period, unless retention is required for legal,
          security, or backup purposes.
        </p>
        <p>
          Dashboard session data is retained only as long as needed for authentication. You can log out to end
          your active session.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We use industry-standard measures to protect data, including encrypted connections (HTTPS), secure
          session handling, and access controls on administrative systems. No method of transmission or storage
          is 100% secure; we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Rights &amp; Choices">
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access, correct, or delete personal data we hold about you</li>
          <li>Object to or restrict certain processing</li>
          <li>Withdraw consent where processing is consent-based</li>
          <li>Request data portability</li>
          <li>Lodge a complaint with a supervisory authority</li>
        </ul>
        <p>
          To exercise these rights, contact us through our support channels. Removing Deelo from a server
          stops new data collection for that guild. Discord account deletion is handled through Discord&apos;s own
          privacy tools.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          The Service is not directed at children under 13. We do not knowingly collect personal information from
          children under 13. If you believe we have collected such information, contact us so we can delete it.
        </p>
      </LegalSection>

      <LegalSection title="10. International Transfers">
        <p>
          Your information may be processed in countries other than your own, including the United States, where
          our service providers operate. We take steps to ensure appropriate safeguards when data is transferred
          internationally.
        </p>
      </LegalSection>

      <LegalSection title="11. Third-Party Links">
        <p>
          Our Service may link to third-party sites (such as Discord). We are not responsible for the privacy
          practices of those sites. We encourage you to review their policies.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on this page and
          update the &quot;Last updated&quot; date. Material changes may be communicated through the website or Discord
          where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          For privacy-related questions or requests, contact us through the support options at {host} or our
          official Discord community.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
