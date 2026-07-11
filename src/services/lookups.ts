import { deeloEmbed } from '../utils/embeds';

const UA = 'DeeloBot/1.0 (+https://deelo.bot)';

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function metaFromHtml(html: string): { title?: string; description?: string; image?: string } {
  const pick = (prop: string) => html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))?.[1];
  return {
    title: pick('og:title') ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim(),
    description: pick('og:description'),
    image: pick('og:image'),
  };
}

export async function lookupCashapp(tag: string) {
  const cashtag = tag.replace(/^\$/, '').trim();
  if (!cashtag) throw new Error('Provide a Cash App $cashtag.');
  const url = `https://cash.app/$${encodeURIComponent(cashtag)}`;
  const html = await fetchText(url);
  const meta = metaFromHtml(html);
  const embed = deeloEmbed(
    meta.title ?? `Cash App — $${cashtag}`,
    [
      meta.description ?? `Public Cash App profile for **$${cashtag}**.`,
      `[Open profile](${url})`,
    ].join('\n'),
  ).setURL(url);
  if (meta.image) embed.setThumbnail(meta.image);
  return embed;
}

export async function lookupGithub(username: string) {
  const user = username.trim().replace(/^@/, '');
  if (!user) throw new Error('Provide a GitHub username.');
  const data = await fetchJson<{
    login: string;
    name?: string;
    bio?: string;
    public_repos?: number;
    followers?: number;
    following?: number;
    html_url: string;
    avatar_url?: string;
    created_at?: string;
  }>(`https://api.github.com/users/${encodeURIComponent(user)}`);
  const embed = deeloEmbed(
    data.name ? `${data.name} (@${data.login})` : `@${data.login}`,
    [
      data.bio ? `${data.bio}\n` : '',
      `**Repos:** ${data.public_repos ?? 0} · **Followers:** ${data.followers ?? 0} · **Following:** ${data.following ?? 0}`,
      data.created_at ? `**Joined:** <t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:D>` : '',
      `[github.com/${data.login}](${data.html_url})`,
    ].filter(Boolean).join('\n'),
  ).setURL(data.html_url);
  if (data.avatar_url) embed.setThumbnail(data.avatar_url);
  return embed;
}

export async function lookupSteam(id: string) {
  const query = id.trim();
  if (!query) throw new Error('Provide a Steam ID or vanity URL.');
  const url = query.match(/^\d{17}$/)
    ? `https://steamcommunity.com/profiles/${query}`
    : `https://steamcommunity.com/id/${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const meta = metaFromHtml(html);
  if (/profile could not be found/i.test(html)) throw new Error('Steam profile not found.');
  const embed = deeloEmbed(
    meta.title ?? 'Steam Profile',
    [meta.description ?? `Steam profile for **${query}**.`, `[View profile](${url})`].join('\n'),
  ).setURL(url);
  if (meta.image) embed.setThumbnail(meta.image);
  return embed;
}

export async function lookupRoblox(username: string) {
  const name = username.trim();
  if (!name) throw new Error('Provide a Roblox username.');
  const users = await fetchJson<{ data: Array<{ id: number; name: string; displayName?: string }> }>(
    'https://users.roblox.com/v1/usernames/users',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usernames: [name], excludeBannedUsers: true }) },
  );
  const user = users.data?.[0];
  if (!user) throw new Error('Roblox user not found.');
  const [profile, avatar] = await Promise.all([
    fetchJson<{ description?: string; created?: string; isBanned?: boolean }>(`https://users.roblox.com/v1/users/${user.id}`).catch(() => null),
    fetchJson<{ data: Array<{ imageUrl?: string }> }>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png`,
    ).catch(() => null),
  ]);
  const profileUrl = `https://www.roblox.com/users/${user.id}/profile`;
  const embed = deeloEmbed(
    user.displayName && user.displayName !== user.name ? `${user.displayName} (@${user.name})` : user.name,
    [
      profile?.description ? `${profile.description.slice(0, 300)}\n` : '',
      `**User ID:** ${user.id}`,
      profile?.created ? `**Created:** <t:${Math.floor(new Date(profile.created).getTime() / 1000)}:D>` : '',
      `[View profile](${profileUrl})`,
    ].filter(Boolean).join('\n'),
  ).setURL(profileUrl);
  const thumb = avatar?.data?.[0]?.imageUrl;
  if (thumb) embed.setThumbnail(thumb);
  return embed;
}

export async function lookupRobloxId(userId: string) {
  const id = userId.trim().replace(/\D/g, '');
  if (!id) throw new Error('Provide a Roblox user ID.');
  const profile = await fetchJson<{ id: number; name: string; displayName?: string; description?: string; created?: string }>(
    `https://users.roblox.com/v1/users/${id}`,
  );
  const profileUrl = `https://www.roblox.com/users/${profile.id}/profile`;
  return deeloEmbed(
    profile.displayName ?? profile.name,
    [
      profile.description ? `${profile.description.slice(0, 300)}\n` : '',
      `**Username:** ${profile.name} · **ID:** ${profile.id}`,
      profile.created ? `**Created:** <t:${Math.floor(new Date(profile.created).getTime() / 1000)}:D>` : '',
      `[View profile](${profileUrl})`,
    ].filter(Boolean).join('\n'),
  ).setURL(profileUrl);
}

export async function lookupMinecraft(username: string) {
  const name = username.trim();
  if (!name) throw new Error('Provide a Minecraft username.');
  const profile = await fetchJson<{ id: string; name: string }>(
    `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
  );
  const skin = await fetchJson<{ properties: Array<{ value: string }> }>(
    `https://sessionserver.mojang.com/session/minecraft/profile/${profile.id}`,
  ).catch(() => null);
  let avatar: string | null = null;
  if (skin?.properties?.[0]?.value) {
    const decoded = JSON.parse(Buffer.from(skin.properties[0].value, 'base64').toString('utf8')) as {
      textures?: { SKIN?: { url?: string } };
    };
    avatar = decoded.textures?.SKIN?.url ?? null;
  }
  return deeloEmbed(
    profile.name,
    [`**UUID:** \`${profile.id}\``, `[NameMC](https://namemc.com/profile/${profile.name})`].join('\n'),
  ).setThumbnail(avatar);
}

export async function lookupOsu(username: string) {
  const name = username.trim();
  if (!name) throw new Error('Provide an osu! username.');
  const data = await fetchJson<Array<{
    username: string;
    pp_rank?: number;
    pp_raw?: number;
    accuracy?: number;
    country?: string;
    level?: number;
    count_ranked?: number;
  }>>(`https://osu.ppy.sh/api/get_user?k=public&u=${encodeURIComponent(name)}&m=0`).catch(() => null);
  const user = data?.[0];
  if (!user) {
    return deeloEmbed(
      'osu!',
      `Could not load stats for **${name}**.\n[Search on osu.ppy.sh](https://osu.ppy.sh/users?lookup=${encodeURIComponent(name)})`,
    );
  }
  return deeloEmbed(
    `osu! — ${user.username}`,
    [
      user.pp_rank ? `**Global rank:** #${user.pp_rank.toLocaleString()}` : '',
      user.pp_raw ? `**PP:** ${Math.round(user.pp_raw).toLocaleString()}` : '',
      user.accuracy ? `**Accuracy:** ${user.accuracy.toFixed(2)}%` : '',
      user.level ? `**Level:** ${user.level}` : '',
      `[Profile](https://osu.ppy.sh/users/${encodeURIComponent(user.username)})`,
    ].filter(Boolean).join('\n'),
  );
}

export async function lookupValorant(name: string) {
  const query = name.trim();
  if (!query) throw new Error('Provide a Riot ID (Name#TAG).');
  const [gameName, tag] = query.includes('#') ? query.split('#') : [query, ''];
  const search = tag ? `${gameName}#${tag}` : query;
  return deeloEmbed(
    'Valorant',
    `Tracker lookup for **${search}**.\n[View on tracker.gg](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(search)}/overview)`,
  );
}

export async function lookupXbox(gamertag: string) {
  const tag = gamertag.trim();
  if (!tag) throw new Error('Provide an Xbox gamertag.');
  return deeloEmbed(
    `Xbox — ${tag}`,
    `[View gamertag on xboxgamertag.com](https://xboxgamertag.com/search/${encodeURIComponent(tag)})`,
  );
}

export async function lookupSnapchat(username: string) {
  const user = username.trim().replace(/^@/, '');
  if (!user) throw new Error('Provide a Snapchat username.');
  return deeloEmbed(
    `Snapchat — ${user}`,
    `[Open Snapchat add link](https://www.snapchat.com/add/${encodeURIComponent(user)})`,
  );
}

export async function lookupTelegram(username: string) {
  const user = username.trim().replace(/^@/, '');
  if (!user) throw new Error('Provide a Telegram username.');
  const url = `https://t.me/${encodeURIComponent(user)}`;
  return deeloEmbed(`Telegram — @${user}`, `[Open t.me/${user}](${url})`).setURL(url);
}

export async function lookupScreenshot(url: string) {
  const target = url.trim();
  if (!target.startsWith('http')) throw new Error('Provide a valid URL.');
  const shot = `https://image.thum.io/get/width/1200/${target}`;
  return deeloEmbed('Screenshot', target).setImage(shot).setURL(target);
}

export async function lookupWeather(city: string) {
  const loc = city.trim();
  if (!loc) throw new Error('Provide a city name.');
  const data = await fetchJson<{
    name: string;
    sys?: { country?: string };
    main?: { temp?: number; feels_like?: number; humidity?: number };
    weather?: Array<{ description?: string }>;
    wind?: { speed?: number };
  }>(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`).catch(() => null);
  if (!data?.main) {
    return deeloEmbed(`Weather — ${loc}`, `[Search OpenWeather](https://openweathermap.org/find?q=${encodeURIComponent(loc)})`);
  }
  const c = (data.main.temp ?? 0) - 273.15;
  const feels = (data.main.feels_like ?? 0) - 273.15;
  return deeloEmbed(
    `Weather — ${data.name}${data.sys?.country ? `, ${data.sys.country}` : ''}`,
    [
      `**${data.weather?.[0]?.description ?? 'Conditions'}**`,
      `**Temp:** ${c.toFixed(1)}°C (feels ${feels.toFixed(1)}°C)`,
      `**Humidity:** ${data.main.humidity ?? '—'}%`,
      data.wind?.speed != null ? `**Wind:** ${data.wind.speed} m/s` : '',
    ].filter(Boolean).join('\n'),
  );
}

export async function lookupDefine(word: string) {
  const w = word.trim();
  if (!w) throw new Error('Provide a word.');
  const data = await fetchJson<Array<{ word: string; meanings: Array<{ partOfSpeech?: string; definitions: Array<{ definition: string; example?: string }> }> }>>(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`,
  );
  const meaning = data[0]?.meanings?.[0];
  const def = meaning?.definitions?.[0];
  if (!def) throw new Error('Word not found.');
  return deeloEmbed(
    w,
    [
      meaning.partOfSpeech ? `*${meaning.partOfSpeech}*` : '',
      def.definition,
      def.example ? `\n*"${def.example}"*` : '',
    ].filter(Boolean).join('\n'),
  );
}

export type LookupHandler = (query: string) => Promise<ReturnType<typeof deeloEmbed>>;

/** Catalog command name → lookup handler */
export const LOOKUP_COMMANDS: Record<string, LookupHandler> = {
  cashapp: lookupCashapp,
  github: lookupGithub,
  steam: lookupSteam,
  roblox: lookupRoblox,
  'roblox fromdiscord': lookupRoblox,
  'roblox check': lookupRoblox,
  'roblox outfits': lookupRoblox,
  minecraft: lookupMinecraft,
  osu: lookupOsu,
  valorant: lookupValorant,
  xbox: lookupXbox,
  snapchat: lookupSnapchat,
  snapchatstory: lookupSnapchat,
  telegram: lookupTelegram,
  screenshot: lookupScreenshot,
  weather: lookupWeather,
  define: lookupDefine,
};

export async function runLookupCommand(name: string, query: string) {
  const handler = LOOKUP_COMMANDS[name.toLowerCase()];
  if (!handler) return null;
  return handler(query);
}
