export interface CommandDef {
  name: string;
  aliases: string[];
  description: string;
  syntax?: string;
  example?: string;
  permission?: string;
  cooldown?: string;
  args: string[];
  cog: string;
  cogName: string;
}

export interface CommandsCatalogFile {
  last_update: number;
  cogs: Array<{
    cog_name: string;
    alt_name?: string;
    description?: string;
    count: number;
    commands: Array<{
      name: string;
      aliases?: string[];
      description?: string;
      syntax?: string;
      example?: string;
      permission?: string;
      cooldown?: string;
      args?: string[];
    }>;
  }>;
}
