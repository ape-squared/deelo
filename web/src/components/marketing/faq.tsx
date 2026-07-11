'use client';

import { ChevronDown } from 'lucide-react';

const FAQ = [
  {
    q: 'Is Deelo free to use?',
    a: 'Yes. Deelo has a generous free tier with moderation, levels, music, snipe, giveaways, and 1,056 commands. Premium unlocks anti-nuke, tickets, social feeds, ChatGPT, and higher limits.',
  },
  {
    q: 'How do I configure my server?',
    a: 'Invite Deelo, then open the web dashboard. Every module — welcome, automod, tickets, levels, voicemaster — is editable without touching code. Changes sync to your server in real time.',
  },
  {
    q: 'Can Deelo replace multiple bots?',
    a: 'Deelo is built to replace moderation bots, music bots, leveling bots, ticket bots, and utility bots in one install. Most servers run Deelo alone.',
  },
  {
    q: 'What prefix does Deelo use?',
    a: 'The default prefix is comma (,). Premium servers can set a custom prefix from the dashboard or with ,prefix set.',
  },
  {
    q: 'Where can I get support?',
    a: 'Join our official Discord server for help, feature requests, and early access to updates. Links are on the homepage and in ,help.',
  },
];

export function FaqSection() {
  return (
    <section className="site-section">
      <div className="mx-auto max-w-3xl lg:px-6">
        <div className="mb-12 text-center">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading">Common questions</h2>
          <p className="section-sub mx-auto">Everything you need to know before adding Deelo.</p>
        </div>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="faq-item group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
