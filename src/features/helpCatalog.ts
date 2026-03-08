export interface CommandInfo {
  name: string;
  description: {
    en: string;
    ja: string;
  };
  usage?: string;
}

export interface CommandCategory {
  name: {
    en: string;
    ja: string;
  };
  commands: CommandInfo[];
}
