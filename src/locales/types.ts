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
      steam: {
        title: string;
        registered: string;
        playtime: string;
        topPlayers: string;
      };
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
      invalidOption: string;
      pollEnded: string;
      pollEndedDesc: string;
      pollError: string;
      pollErrorDesc: string;
    };
  };

  // Steam command
  steam: {
    profile: {
      title: string;
      status: string;
      level: string;
      games: string;
      playtime: string;
      recentActivity: string;
      profileInfo: string;
      realName: string;
      country: string;
      memberSince: string;
      steamId: string;
      profileLink: string;
      viewOnSteam: string;
      publicProfile: string;
      privateProfile: string;
      privacyNote: string;
      playing: string;
    };
    register: {
      title: string;
      success: string;
      alreadyRegistered: string;
      confirm: string;
      confirmDesc: string;
      validFormats: string;
      linked: string;
      updated: string;
      viewProfile: string;
    };
    unregister: {
      title: string;
      success: string;
      notRegistered: string;
      confirm: string;
      confirmDesc: string;
      unlinked: string;
      removedAccount: string;
    };
    whoami: {
      title: string;
      notRegistered: string;
      info: string;
      linkedSince: string;
      viewProfile: string;
    };
    ranking: {
      title: string;
      noData: string;
      totalPlaytime: string;
      periodGain: string;
      noRegistered: string;
      loading: string;
      combined: string;
      average: string;
      page: string;
      couldNotRetrieve: string;
      totalPlayers: string;
    };
    history: {
      title: string;
      noData: string;
      period: string;
      gain: string;
      currentTotal: string;
      playtimeAdded: string;
      howItWorks: string;
      recordedDaily: string;
      trackedFrom: string;
      notEnoughData: string;
      currentTotalPlaytime: string;
      periods: {
        day: string;
        week: string;
        month: string;
        threeMonths: string;
        sixMonths: string;
        year: string;
      };
    };
    games: {
      title: string;
      totalGames: string;
      noGames: string;
      top5: string;
    };
    playtime: {
      title: string;
      total: string;
      last2Weeks: string;
      topGames: string;
    };
    recent: {
      title: string;
      noRecent: string;
      dailyAverage: string;
    };
    notify: {
      title: string;
      enabled: string;
      disabled: string;
      setup: string;
      removed: string;
      howItWorks: string;
      howItWorksDesc: string;
      statusOn: string;
      statusOff: string;
      yourStatus: string;
      serverStatus: string;
      channel: string;
      configured: string;
      notSetup: string;
      setupFirst: string;
      noSettings: string;
      nowEnabled: string;
      nowDisabled: string;
      meStatus: string;
      meEnabled: string;
      meDisabled: string;
      meNowEnabled: string;
      meNowDisabled: string;
    };
    nowPlaying: {
      title: string;
      noPlayers: string;
    };
    help: {
      title: string;
      description: string;
      accountSection: string;
      accountCommands: string;
      statsSection: string;
      statsCommands: string;
      optionsSection: string;
      optionsDesc: string;
      autocompleteHint: string;
    };
    chart: {
      title: string;
      topNGames: string;
      totalPlaytime: string;
      playtimeAxis: string;
      totalPlaytimeAxis: string;
    };
    historyGraph: {
      title: string;
      period: string;
      playtimeAdded: string;
      playtimeChange: string;
      recordedDaily: string;
    };
    errors: {
      userNotFound: string;
      invalidSteamId: string;
      couldNotResolve: string;
      userNotLinked: string;
      notLinked: string;
      couldNotRetrieve: string;
      privateProfile: string;
      apiError: string;
      notRegistered: string;
      gameNotFound: string;
      onlyCommandUser: string;
      cancelled: string;
      timeout: string;
      apiKeyNotConfigured: string;
    };
    status: {
      online: string;
      offline: string;
      away: string;
      busy: string;
      inGame: string;
      private: string;
      public: string;
      snooze: string;
      lookingToTrade: string;
      lookingToPlay: string;
      unknown: string;
    };
    buttons: {
      confirm: string;
      cancel: string;
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
        roleHierarchy: string;
        alreadyHasRole: string;
        doesNotHaveRole: string;
        failed: string;
      };
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
  };

  // Notification command
  notification: {
    voice: {
      setTitle: string;
      set: string;
      removedTitle: string;
      removed: string;
    };
    welcome: {
      setTitle: string;
      set: string;
      removedTitle: string;
      removed: string;
    };
    status: {
      title: string;
      voiceLabel: string;
      welcomeLabel: string;
      disabled: string;
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
    };
  };

  // GitHub command
  github: {
    pr: {
      list: {
        title: string;
        noPrs: string;
        open: string;
        closed: string;
      };
      view: {
        title: string;
        state: string;
        author: string;
        base: string;
        head: string;
        mergeable: string;
        changes: string;
        files: string;
        labels: string;
      };
      create: {
        success: string;
        successDesc: string;
        modalTitle: string;
      };
      merge: {
        success: string;
        successDesc: string;
        confirmTitle: string;
        confirmDesc: string;
        confirmButton: string;
        merging: string;
      };
    };
    issue: {
      list: {
        title: string;
        noIssues: string;
      };
      view: {
        title: string;
        state: string;
        author: string;
        assignees: string;
        labels: string;
        milestone: string;
      };
      create: {
        success: string;
        successDesc: string;
        modalTitle: string;
      };
    };
    modal: {
      titleLabel: string;
      bodyLabel: string;
      bodyPlaceholder: string;
      headLabel: string;
      baseLabel: string;
    };
    repo: {
      info: {
        title: string;
        description: string;
        stars: string;
        forks: string;
        language: string;
        defaultBranch: string;
        noDesc: string;
      };
    };
    errors: {
      tokenNotSet: string;
      noPermission: string;
      invalidRepo: string;
      notFound: string;
      isPullRequest: string;
      forbidden: string;
      conflict: string;
      apiError: string;
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
      noPermission: string;
      noPermissionDesc: string;
      connectionLimit: string;
      connectionLimitDesc: string;
      recordingInProgress: string;
      recordingInProgressDesc: string;
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
