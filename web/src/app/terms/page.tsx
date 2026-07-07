import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal-layout';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for using Deelo, the Discord bot and web dashboard.',
};

const UPDATED = 'July 6, 2026';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED}>
      <LegalSection title="1. Agreement">
        <p>
          By inviting Deelo to a Discord server, using Deelo commands, or accessing the Deelo website and dashboard
          at deelo.bot (the &quot;Service&quot;), you agree to these Terms of Service (&quot;Terms&quot;). If you do not agree,
          do not use the Service.
        </p>
        <p>
          If you use the Service on behalf of a Discord server or organization, you represent that you have authority
          to bind that server or organization to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          Deelo is a Discord bot and companion web dashboard that provides moderation, automation, leveling,
          music, tickets, and related community tools. Features may change, be added, or be removed at any time.
          Some features require a paid subscription (&quot;Premium&quot;).
        </p>
        <p>
          We do not guarantee uninterrupted availability. Maintenance, Discord API outages, or third-party failures
          may affect the Service. See our <a href="/status">status page</a> for current health information.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility &amp; Discord">
        <p>
          You must comply with Discord&apos;s{' '}
          <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
          {' '}and{' '}
          <a href="https://discord.com/guidelines" target="_blank" rel="noopener noreferrer">Community Guidelines</a>.
          You must be at least 13 years old (or the minimum age required in your jurisdiction) to use Discord and this Service.
        </p>
        <p>
          Server administrators who configure Deelo are responsible for how the bot is used in their communities,
          including moderation actions, automated messages, and data collected from members.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts &amp; Dashboard Access">
        <p>
          The web dashboard uses Discord OAuth for authentication. You are responsible for maintaining the security
          of your Discord account. We grant dashboard access only to users with appropriate permissions in a server
          (such as Administrator or Manage Server).
        </p>
        <p>
          You must not attempt to access servers, guild settings, or admin areas you are not authorized to use.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>You agree not to use Deelo to:</p>
        <ul>
          <li>Violate any law or third-party rights</li>
          <li>Harass, abuse, spam, or distribute malware</li>
          <li>Circumvent moderation, security, or rate limits</li>
          <li>Reverse engineer, scrape, or overload our systems</li>
          <li>Resell, sublicense, or misrepresent the Service without permission</li>
          <li>Use premium features without a valid subscription or redeem code</li>
        </ul>
        <p>
          We may suspend or terminate access to the Service, remove the bot from servers, or revoke subscriptions
          if we reasonably believe these Terms have been violated.
        </p>
      </LegalSection>

      <LegalSection title="6. Subscriptions &amp; Payments">
        <p>
          Premium plans, redeem codes, and subscription grants are subject to the pricing and features described on
          our <a href="/pricing">pricing page</a> at the time of purchase or activation. Unless otherwise stated,
          subscriptions are prepaid and non-refundable except where required by law.
        </p>
        <p>
          We may change pricing or plan features with reasonable notice. Existing paid periods are generally honored
          for the duration already purchased unless otherwise required.
        </p>
      </LegalSection>

      <LegalSection title="7. User &amp; Server Content">
        <p>
          You retain ownership of content you and your server members submit through Discord. By using the Service,
          you grant us a limited license to process, store, and display that content solely to operate Deelo
          (for example: welcome messages, moderation logs, level data, ticket transcripts, and dashboard settings).
        </p>
        <p>
          We are not responsible for user-generated content in your server. Server staff are responsible for
          configuring automod, logging, and other tools appropriately.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <p>
          Deelo, its branding, website, dashboard, and underlying software are owned by us or our licensors.
          These Terms do not grant you any right to use our trademarks except as needed to identify the bot in Discord.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimer of Warranties">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
          IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYNTAX AND ITS OPERATORS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL,
          ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS
          LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM, OR USD $50 IF YOU
          HAVE NOT PAID ANYTHING.
        </p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          You may stop using the Service at any time by removing Deelo from your server and discontinuing dashboard
          use. We may terminate or restrict the Service at our discretion, with or without notice, especially for
          violations of these Terms or risk to the platform.
        </p>
        <p>
          Sections that by their nature should survive termination (including disclaimers, limitations of liability,
          and governing law) will continue to apply.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. We will post the revised version on this page and update the
          &quot;Last updated&quot; date. Continued use of the Service after changes become effective constitutes acceptance
          of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing Law">
        <p>
          These Terms are governed by the laws of the United States and the State of Delaware, without regard to
          conflict-of-law principles, except where mandatory local consumer protections apply.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          For questions about these Terms, contact us through the support options listed on deelo.bot or our
          official Discord community.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
