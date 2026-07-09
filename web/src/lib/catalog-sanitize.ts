/** Sanitize bleed.bot catalog copy for Deelo branding. */
export function sanitizeCatalogText(text: string): string {
  return text
    .replace(/bleed\.bot/gi, 'Deelo')
    .replace(/bleed's/gi, "Deelo's")
    .replace(/Bleed Booster/gi, 'Premium')
    .replace(/\bbleed\b/gi, 'Deelo');
}

export function sanitizeCatalogPayload<T extends {
  cogs?: Array<{
    description?: string;
    commands?: Array<{ description?: string; permission?: string }>;
  }>;
}>(catalog: T): T {
  if (!catalog.cogs) return catalog;
  return {
    ...catalog,
    cogs: catalog.cogs.map((cog) => ({
      ...cog,
      description: sanitizeCatalogText(cog.description || ''),
      commands: (cog.commands || []).map((cmd) => ({
        ...cmd,
        description: sanitizeCatalogText(cmd.description || ''),
        permission: cmd.permission ? sanitizeCatalogText(cmd.permission) : cmd.permission,
      })),
    })),
  };
}
