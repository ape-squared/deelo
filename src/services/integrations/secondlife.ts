import { fetchText } from './fetch';

const HOMEPAGE_FEED = 'https://api.secondlife.com/datafeeds/homepage.txt';
const LINDEX_FEED = 'https://api.secondlife.com/datafeeds/lindex.txt';
const STATUS_FEED = 'https://api.secondlife.com/datafeeds/secondlife.xml';

export interface SecondLifeStats {
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  signups: number;
  signupsUpdated: string;
  inworld: number;
  inworldUpdated: string;
  exchangeRate: number;
  exchangeRateUpdated: string;
}

export interface LindeXStats {
  updated: string;
  marketBuy: { minRate: number; maxRate: number; lindenVolume: number; usdVolume: number };
  marketSell: { minRate: number; maxRate: number; lindenVolume: number; usdVolume: number };
  limitBuyBest10: { minRate: number; maxRate: number; lindenOffered: number };
  limitSellBest10: { minRate: number; maxRate: number; lindenOffered: number };
}

function parseTextFeed(text: string): Record<string, string> {
  const lines = text.trim().split('\n');
  const result: Record<string, string> = {};
  for (let i = 0; i < lines.length - 1; i += 2) {
    result[lines[i]!.trim()] = lines[i + 1]!.trim();
  }
  return result;
}

function parseIntSafe(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(value: string | undefined): number {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

function formatLinden(amount: number): string {
  return `L$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function getSecondLifeStats(): Promise<SecondLifeStats> {
  const [homepageText, statusText] = await Promise.all([
    fetchText(HOMEPAGE_FEED),
    fetchText(STATUS_FEED),
  ]);

  const homepage = parseTextFeed(homepageText);
  const statusMatch = statusText.match(/<status>([^<]+)<\/status>/i);

  return {
    status: statusMatch?.[1] === 'ONLINE' ? 'ONLINE' : statusMatch?.[1] === 'OFFLINE' ? 'OFFLINE' : 'UNKNOWN',
    signups: parseIntSafe(homepage.signups),
    signupsUpdated: homepage.signups_updated_slt ?? 'Unknown',
    inworld: parseIntSafe(homepage.inworld),
    inworldUpdated: homepage.inworld_updated_slt ?? 'Unknown',
    exchangeRate: parseFloatSafe(homepage.exchange_rate),
    exchangeRateUpdated: homepage.exchange_rate_updated_slt ?? 'Unknown',
  };
}

export async function getLindeXStats(): Promise<LindeXStats> {
  const text = await fetchText(LINDEX_FEED);
  const feed = parseTextFeed(text);

  return {
    updated: feed.updated_slt ?? 'Unknown',
    marketBuy: {
      minRate: parseIntSafe(feed.mb_t_min_rate),
      maxRate: parseIntSafe(feed.mb_t_max_rate),
      lindenVolume: parseFloatSafe(feed.mb_t_l$),
      usdVolume: parseFloatSafe(feed.mb_t_us$),
    },
    marketSell: {
      minRate: parseIntSafe(feed.ms_t_min_rate),
      maxRate: parseIntSafe(feed.ms_t_max_rate),
      lindenVolume: parseFloatSafe(feed.ms_t_l$),
      usdVolume: parseFloatSafe(feed.ms_t_us$),
    },
    limitBuyBest10: {
      minRate: parseIntSafe(feed['lb_10%_min_rate']),
      maxRate: parseIntSafe(feed['lb_10%_max_rate']),
      lindenOffered: parseFloatSafe(feed['lb_10%_l$_offer']),
    },
    limitSellBest10: {
      minRate: parseIntSafe(feed['ls_10%_min_rate']),
      maxRate: parseIntSafe(feed['ls_10%_max_rate']),
      lindenOffered: parseFloatSafe(feed['ls_10%_l$_offer']),
    },
  };
}

export function buildSecondLifeEmbed(stats: SecondLifeStats) {
  const statusEmoji = stats.status === 'ONLINE' ? '🟢' : stats.status === 'OFFLINE' ? '🔴' : '⚪';
  const usdPerLinden = stats.exchangeRate > 0 ? (1 / stats.exchangeRate).toFixed(4) : '?';

  return [
    `${statusEmoji} **Grid:** ${stats.status}`,
    `👥 **Residents online:** ${stats.inworld.toLocaleString()} *(updated ${stats.inworldUpdated} SLT)*`,
    `📋 **Total signups:** ${stats.signups.toLocaleString()} *(updated ${stats.signupsUpdated} SLT)*`,
    `💱 **Exchange rate:** ${stats.exchangeRate.toFixed(2)} L$ per US$ (${usdPerLinden} US$ per L$)`,
    `   *Updated ${stats.exchangeRateUpdated} SLT*`,
    '',
    '[Second Life](https://secondlife.com) · [Live Data Feeds](https://wiki.secondlife.com/wiki/Linden_Lab_Official:Live_Data_Feeds)',
  ].join('\n');
}

export function buildLindeXEmbed(stats: LindeXStats) {
  const { marketBuy: mb, marketSell: ms, limitBuyBest10: lb, limitSellBest10: ls } = stats;

  return [
    `🕐 **Last updated:** ${stats.updated} SLT`,
    '',
    '**Market buy (today)**',
    `Rate: ${mb.minRate}–${mb.maxRate} L$/US$ · Volume: ${formatLinden(mb.lindenVolume)} (${formatUsd(mb.usdVolume)})`,
    '',
    '**Market sell (today)**',
    `Rate: ${ms.minRate}–${ms.maxRate} L$/US$ · Volume: ${formatLinden(ms.lindenVolume)} (${formatUsd(ms.usdVolume)})`,
    '',
    '**Limit orders (best 10%)**',
    `Buy: ${lb.minRate}–${lb.maxRate} L$/US$ · ${formatLinden(lb.lindenOffered)} offered`,
    `Sell: ${ls.minRate}–${ls.maxRate} L$/US$ · ${formatLinden(ls.lindenOffered)} offered`,
    '',
    '[LindeX](https://secondlife.com/my/lindex/market.php)',
  ].join('\n');
}
