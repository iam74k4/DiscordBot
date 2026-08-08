/**
 * i18n System for Discord Bot
 *
 * ## Adding a New Language
 *
 * 1. Update `Locale` type: Add the new locale code (e.g., 'ko')
 *    ```ts
 *    export type Locale = 'ja' | 'en' | 'ko';
 *    ```
 *
 * 2. Update `SUPPORTED_LOCALES`: Add the new locale to the array
 *    ```ts
 *    export const SUPPORTED_LOCALES: Locale[] = ['ja', 'en', 'ko'];
 *    ```
 *
 * 3. Create translation file: Copy `en.ts` to `{locale}.ts` and translate all strings
 *    - File: `src/locales/ko.ts`
 *    - Export: `export const ko: TranslationKeys = { ... }`
 *
 * 4. Register in index.ts:
 *    - Import: `import { ko } from './ko.js';`
 *    - Add to translations: `const translations: Record<Locale, TranslationKeys> = { en, ja, ko };`
 *    - Add Discord locale mapping in `mapDiscordLocale()`:
 *      ```ts
 *      const localeMap: Record<string, Locale> = {
 *        ja: 'ja',
 *        'en-US': 'en',
 *        'en-GB': 'en',
 *        ko: 'ko',  // Discord locale code -> our locale
 *      };
 *      ```
 *
 * 5. Add Discord locale to `getLocalizations()` in `index.ts` (if needed for command localization)
 *
 * ## Discord Locale Codes Reference
 * See: https://discord.com/developers/docs/reference#locales
 */

/**
 * Supported locales
 */
export type Locale = 'ja' | 'en';

/**
 * Default locale for unmapped Discord locales
 */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Supported locales list
 */
export const SUPPORTED_LOCALES: Locale[] = ['ja', 'en'];

/**
 * Translation keys structure
 * Nested object with string values
 */
export interface TranslationKeys {
  // Common
  common: {
    error: string;
    warning: string;
    success: string;
    loading: string;
    notFound: string;
    guildOnly: string;
    noPermission: string;
    status: string;
    noData: string;
    unexpectedError: string;
    cooldown: string;
    commandBlocked: string;
    permissionsRequired: string;
    permissionsUnverifiable: string;
    confirm: string;
    cancel: string;
    confirmMessage: string;
    timeout: string;
    cancelled: string;
    nextStep: string;
  };

  // Units
  units: {
    hours: string;
    hoursPerPlayer: string;
    perDay: string;
    minutes: string;
    hoursAndMinutes: string;
  };

  // Settings command
  settings: {
    title: string;
    updated: string;
    language: {
      name: string;
      changed: string;
      current: string;
      auto: string;
      autoHint: string;
    };
    audit: {
      name: string;
      notSet: string;
      configured: string;
      disabled: string;
    };
    logs: {
      title: string;
      noLogs: string;
      showing: string;
    };
    view: {
      footer: string;
    };
    howToChange: string;
    selectSetting: string;
    overview: string;
    panel: {
      languagePlaceholder: string;
      auditPlaceholder: string;
      clearAudit: string;
      overviewFooter: string;
      languageFooter: string;
      auditFooter: string;
    };
  };

  // Server command
  server: {
    stats: {
      title: string;
      members: string;
      total: string;
      online: string;
      offline: string;
      bots: string;
    };
  };

  // Roulette command
  roulette: {
    member: {
      title: string;
      countdown: string;
      selecting: string;
      result: string;
      onlyOne: string;
      footer: string;
    };
    team: {
      title: string;
      shuffling: string;
      result: string;
      resultDesc: string;
      teamName: string;
      noMembers: string;
      footer: string;
    };
    errors: {
      notInVoice: string;
      notInVoiceDesc: string;
      noMembers: string;
      noMembersDesc: string;
      notEnough: string;
      notEnoughDesc: string;
    };
  };

  // Ping command
  ping: {
    title: string;
    latency: string;
    apiLatency: string;
  };

  // Poll command
  poll: {
    title: string;
    created: string;
    ended: string;
    votes: string;
    noVotes: string;
    anonymous: string;
    total: string;
    endsIn: string;
    voteChanged: string;
    alreadyVoted: string;
    votedFor: string;
    endedMessage: string;
    noActivePoll: string;
    noActivePollDesc: string;
    errors: {
      notEnoughOptions: string;
      tooManyOptions: string;
      questionTooLong: string;
      optionTooLong: string;
      maxActivePolls: string;
      maxActivePollsDesc: string;
      invalidOption: string;
      pollEnded: string;
      pollEndedDesc: string;
      pollError: string;
      pollErrorDesc: string;
    };
  };

  // Admin command
  admin: {
    reload: {
      title: string;
      success: string;
    };
    deploy: {
      title: string;
      success: string;
    };
    role: {
      add: {
        success: string;
        successDesc: string;
      };
      remove: {
        success: string;
        successDesc: string;
      };
      errors: {
        noPermission: string;
        memberNotFound: string;
        botRoleHierarchy: string;
        actorRoleHierarchy: string;
        targetMemberHierarchy: string;
        botTargetMemberHierarchy: string;
        alreadyHasRole: string;
        doesNotHaveRole: string;
        failed: string;
      };
    };
    panel: {
      statsTab: string;
      dbTab: string;
      guildsTab: string;
      healthTab: string;
      metricsTab: string;
      backupsTab: string;
      refresh: string;
      runBackup: string;
      statsTitle: string;
      dbTitle: string;
      guildsTitle: string;
      healthTitle: string;
      metricsTitle: string;
      backupsTitle: string;
      backupsFooter: string;
      serversLabel: string;
      usersLabel: string;
      channelsLabel: string;
      uptimeLabel: string;
      memoryLabel: string;
      nodeLabel: string;
      registeredUsersLabel: string;
      tablesLabel: string;
      backupSuccess: string;
      backupFailure: string;
    };
  };

  owner: {
    errors: {
      ownerOnly: string;
    };
    broadcast: {
      confirm: string;
      progress: string;
      complete: string;
      capNote: string;
    };
    backup: {
      confirm: string;
      complete: string;
      failed: string;
    };
  };

  // Help command
  help: {
    title: string;
    description: string;
    usage: string;
    footer: string;
    commandNotFound: string;
    commandNotFoundDesc: string;
    permission: {
      everyone: string;
      manageGuild: string;
      manageRoles: string;
      owner: string;
    };
    filteredFooter: string;
    selectCategory: string;
    showAll: string;
    onlyCommandUser: string;
  };

  // Notification command
  notification: {
    voice: {
      setTitle: string;
      set: string;
      removedTitle: string;
      removed: string;
      nextStep: string;
      disabledHint: string;
    };
    welcome: {
      setTitle: string;
      set: string;
      removedTitle: string;
      removed: string;
      nextStep: string;
      disabledHint: string;
    };
    status: {
      title: string;
      voiceLabel: string;
      welcomeLabel: string;
      disabled: string;
    };
    panel: {
      statusTab: string;
      statsTab: string;
      periodPlaceholder: string;
      voicePlaceholder: string;
      welcomePlaceholder: string;
      removeVoice: string;
      removeWelcome: string;
      statusDescription: string;
    };
    stats: {
      title: string;
      noData: string;
      total: string;
      period: string;
      periods: {
        today: string;
        week: string;
        month: string;
        all: string;
      };
    };
    events: {
      voiceJoin: string;
      voiceLeave: string;
      memberJoinTitle: string;
      memberJoin: string;
      memberCount: string;
    };
    errors: {
      textChannelOnly: string;
      notConfigured: string;
      channelNotSendable: string;
      manageGuildRequired: string;
    };
  };

  // Record command
  record: {
    title: string;
    recording: string;
    recordingDesc: string;
    success: string;
    successDesc: string;
    processing: string;
    successNextStep: string;
    durationNote: string;
    statusHint: string;
    errors: {
      notInVoice: string;
      notInVoiceDesc: string;
      botNotInVoice: string;
      botNotInVoiceDesc: string;
      invalidDuration: string;
      invalidDurationDesc: string;
      durationTooLong: string;
      durationTooLongDesc: string;
      durationExceedsBuffer: string;
      durationExceedsBufferDesc: string;
      noAudibleAudio: string;
      noAudibleAudioDesc: string;
      noPermission: string;
      noPermissionDesc: string;
      connectionLimit: string;
      connectionLimitDesc: string;
      recordingInProgress: string;
      recordingInProgressDesc: string;
      deliveryIncomplete: string;
      deliveryIncompleteDesc: string;
      failed: string;
      failedDesc: string;
    };
  };
}

/**
 * Flatten nested object keys with dot notation
 * e.g., { common: { error: 'Error' } } -> 'common.error'
 */
type FlattenKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? FlattenKeys<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}`
        : never;
    }[keyof T]
  : never;

/**
 * All available translation keys as string literals
 */
export type TranslationKey = FlattenKeys<TranslationKeys>;
