import Link from 'next/link';
import { MessageCircle, Users, ExternalLink } from 'lucide-react';
import type { DiscordSiteSettings } from '@/lib/site-content';

export function DiscordWidget({
  settings,
  className = '',
  compact = false,
}: {
  settings: DiscordSiteSettings;
  className?: string;
  compact?: boolean;
}) {
  if (!settings.widget_enabled) {
    return (
      <div className={`card card-glow p-8 text-center ${className}`}>
        <MessageCircle className="mx-auto mb-4 h-10 w-10 text-accent" />
        <h3 className="text-lg font-semibold mb-2">Join our community</h3>
        <p className="text-sm text-muted mb-6">Get support, share feedback, and stay up to date with Deelo.</p>
        <a href={settings.invite_url} className="btn-primary text-sm" target="_blank" rel="noreferrer">
          Join Discord
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  const widgetSrc = `https://discord.com/widget?id=${settings.server_id}&theme=dark`;

  if (compact) {
    return (
      <div className={`discord-widget-wrap discord-widget-compact ${className}`}>
        <iframe
          src={widgetSrc}
          title="Deelo Discord server"
          className="discord-widget-iframe"
          allowTransparency
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      </div>
    );
  }

  return (
    <div className={`discord-widget-section ${className}`}>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent-soft px-4 py-1.5 text-sm text-accent">
            <Users className="h-4 w-4" />
            Official Discord
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Join the Deelo community
          </h2>
          <p className="text-muted leading-relaxed mb-6 max-w-md">
            Hang out with other server owners, get help from the team, see announcements first, and vote on what we build next.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={settings.invite_url} className="btn-primary text-sm" target="_blank" rel="noreferrer">
              Open in Discord
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link href="/announcements" className="btn-secondary text-sm">
              Site announcements
            </Link>
            <Link href="/changelog" className="btn-ghost text-sm">
              Changelog
            </Link>
          </div>
        </div>

        <div className="discord-widget-wrap">
          <div className="discord-widget-glow" aria-hidden />
          <iframe
            src={widgetSrc}
            title="Deelo Discord server"
            className="discord-widget-iframe"
            allowTransparency
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
