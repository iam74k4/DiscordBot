export type PermissionLevel =
  | 'everyone'
  | 'manageGuild'
  | 'manageRoles'
  | 'owner';

export interface CommandInfo {
  name: string;
  description: {
    en: string;
    ja: string;
  };
  usage?: string;
  /** 表示に必要な最低権限。複数指定時は OR（いずれかで表示） */
  requiredPermission?: PermissionLevel | PermissionLevel[];
}

export interface CommandCategory {
  name: {
    en: string;
    ja: string;
  };
  commands: CommandInfo[];
}

const categories: CommandCategory[] = [];

export function registerHelpCategory(category: CommandCategory): void {
  categories.push(category);
}

export function getHelpCategories(): readonly CommandCategory[] {
  return categories;
}
