/** Client-safe Discord role types and formatting. */

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export function roleOptions(roles: GuildRole[]): { value: string; label: string }[] {
  return [...roles]
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      value: r.id,
      label: r.color ? `${r.name}` : r.name,
    }));
}

export function roleLabel(roles: GuildRole[], roleId: string): string {
  const role = roles.find((r) => r.id === roleId);
  return role ? `@${role.name}` : roleId;
}
