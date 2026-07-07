/** Build a Discord CDN avatar URL from a user id and avatar hash (or pass through an existing URL). */
export function discordAvatarUrl(userId: string, avatar: string | null, size = 64): string {
  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> BigInt(22)) % 6}.png`;
  }
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  const ext = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=${size}`;
}
