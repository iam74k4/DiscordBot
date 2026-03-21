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
  /** Minimum permission level required to display. Multiple values are OR (any match shows). */
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
