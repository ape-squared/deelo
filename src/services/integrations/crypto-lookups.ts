import { EmbedBuilder } from 'discord.js';
import { fetchJson } from './fetch';

const COIN_ALIASES: Record<string, string> = {
  btc: 'bitcoin',
  bitcoin: 'bitcoin',
  eth: 'ethereum',
  ethereum: 'ethereum',
  sol: 'solana',
  solana: 'solana',
  doge: 'dogecoin',
  dogecoin: 'dogecoin',
  xrp: 'ripple',
  ripple: 'ripple',
  ada: 'cardano',
  cardano: 'cardano',
  ltc: 'litecoin',
  litecoin: 'litecoin',
  bnb: 'binancecoin',
  usdt: 'tether',
  usdc: 'usd-coin',
  matic: 'matic-network',
  pol: 'matic-network',
  avax: 'avalanche-2',
  dot: 'polkadot',
  link: 'chainlink',
};

function resolveCoinId(input: string): string {
  const key = input.toLowerCase().trim();
  return COIN_ALIASES[key] ?? key;
}

export async function buildCryptoPriceEmbed(coinInput: string): Promise<EmbedBuilder> {
  const id = resolveCoinId(coinInput);
  let data: Record<string, { usd: number; usd_24h_change?: number }>;

  try {
    data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`,
    );
  } catch {
    const search = await fetchJson<{ coins?: Array<{ id: string; name: string; symbol: string }> }>(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(coinInput)}`,
    );
    const hit = search.coins?.[0];
    if (!hit) throw new Error(`Unknown coin: **${coinInput}**`);
    data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(hit.id)}&vs_currencies=usd&include_24hr_change=true`,
    );
    const price = data[hit.id]?.usd;
    if (price == null) throw new Error(`Unknown coin: **${coinInput}**`);
    const change = data[hit.id]?.usd_24h_change;
    return new EmbedBuilder()
      .setColor(0xf7931a)
      .setTitle(`${hit.name} (${hit.symbol.toUpperCase()})`)
      .setDescription(
        [`**Price:** $${price.toLocaleString(undefined, { maximumFractionDigits: 8 })}`, change != null ? `**24h:** ${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''].filter(Boolean).join('\n'),
      )
      .setFooter({ text: 'Deelo · CoinGecko' });
  }

  const price = data[id]?.usd;
  if (price == null) throw new Error(`Unknown coin: **${coinInput}**. Try \`bitcoin\`, \`eth\`, or \`btc\`.`);
  const change = data[id]?.usd_24h_change;
  return new EmbedBuilder()
    .setColor(0xf7931a)
    .setTitle(id.charAt(0).toUpperCase() + id.slice(1))
    .setDescription(
      [`**Price:** $${price.toLocaleString(undefined, { maximumFractionDigits: 8 })}`, change != null ? `**24h:** ${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : ''].filter(Boolean).join('\n'),
    )
    .setFooter({ text: 'Deelo · CoinGecko' });
}

export async function buildGasPriceEmbed(): Promise<EmbedBuilder> {
  try {
    const data = await fetchJson<{ normal?: number; fast?: number; instant?: number }>('https://ethgas.watch/api/gas');
    const normal = data.normal ?? data.fast;
    const fast = data.fast ?? data.instant;
    if (normal != null) {
      return new EmbedBuilder()
        .setColor(0x627eea)
        .setTitle('Ethereum Gas')
        .setDescription(
          [`**Normal:** ${normal} Gwei`, fast != null ? `**Fast:** ${fast} Gwei` : ''].filter(Boolean).join('\n'),
        )
        .setFooter({ text: 'Deelo · ethgas.watch' });
    }
  } catch {
    /* fallback */
  }
  return new EmbedBuilder()
    .setColor(0x627eea)
    .setTitle('Ethereum Gas')
    .setDescription('Could not fetch live gas prices. Check [etherscan.io/gastracker](https://etherscan.io/gastracker).')
    .setFooter({ text: 'Deelo · Gas' });
}

export async function buildEthAddressEmbed(address: string): Promise<EmbedBuilder> {
  const addr = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error('Provide a valid Ethereum address (`0x…`).');
  }

  const data = await fetchJson<{
    coin_balance?: string;
    exchange_rate?: string;
    transactions_count?: number;
  }>(`https://eth.blockscout.com/api/v2/addresses/${addr}`);

  const wei = BigInt(data.coin_balance ?? '0');
  const eth = Number(wei) / 1e18;
  const usdRate = parseFloat(data.exchange_rate ?? '0');
  const usd = usdRate > 0 ? eth * usdRate : null;

  return new EmbedBuilder()
    .setColor(0x627eea)
    .setTitle('Ethereum Address')
    .setDescription(
      [
        `\`${addr}\``,
        `**Balance:** ${eth.toFixed(6)} ETH`,
        usd != null ? `**≈ USD:** $${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '',
        data.transactions_count != null ? `**Transactions:** ${data.transactions_count.toLocaleString()}` : '',
        `[View on Blockscout](https://eth.blockscout.com/address/${addr})`,
      ].filter(Boolean).join('\n'),
    )
    .setFooter({ text: 'Deelo · Blockscout' });
}
