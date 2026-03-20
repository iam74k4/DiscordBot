import type { TranslationKeys } from './types.js';

/**
 * English translations
 */
export const en: TranslationKeys = {
  common: {
    error: 'Error',
    warning: 'Warning',
    success: 'Success',
    loading: 'Loading...',
    notFound: 'Not Found',
    guildOnly: 'This command can only be used in a server.',
    noPermission: 'You do not have permission to use this command.',
    status: 'Status',
    noData: 'No data',
    unexpectedError:
      'An unexpected error occurred while executing this command.',
    cooldown: 'Please wait {time} seconds before using `/{command}` again.',
    commandBlocked: 'Command Blocked',
    permissionsRequired: 'You need the following permissions: {permissions}',
    permissionsUnverifiable: 'Unable to verify permissions.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    confirmMessage: 'Are you sure you want to proceed?',
    timeout: 'This interaction has timed out.',
    cancelled: 'Action cancelled.',
  },

  units: {
    hours: 'hours',
    hoursPerPlayer: 'hours/player',
    perDay: 'day',
    minutes: 'min',
    hoursAndMinutes: '{hours}h {minutes}m',
  },

  settings: {
    title: 'Server Settings',
    updated: 'Settings Updated',
    language: {
      name: 'Language',
      changed: 'Language changed to {language}',
      current: 'Current Language',
    },
    audit: {
      name: 'Audit Channel',
      notSet: 'Not set',
      configured: 'Audit logs will be sent to <#{channel}>',
      disabled: 'Audit log channel has been removed.',
    },
    logs: {
      title: 'Audit Logs',
      noLogs: 'No audit logs found for this server.',
      showing: 'Showing {count} of {total} logs',
    },
    view: {
      footer: 'Use /admin settings to modify',
    },
    howToChange: 'How to change',
    selectSetting: 'Select a setting...',
    overview: 'Overview',
  },

  server: {
    stats: {
      title: 'Server Statistics',
      members: 'Members',
      total: 'Total',
      online: 'Online',
      offline: 'Offline',
      bots: 'Bots',
      steam: {
        title: 'Steam Integration',
        registered: 'Registered',
        playtime: 'Combined Playtime',
        topPlayers: 'Top Steam Players',
      },
    },
  },

  roulette: {
    member: {
      title: 'Roulette',
      countdown: '{count}...',
      selecting: 'Selecting from candidates...\n\n[{candidates}]',
      result: 'Roulette Result',
      onlyOne: 'Only one member in the channel!\n\nSelected: {member}',
      footer: 'Selected from {count} members in {channel}',
    },
    team: {
      title: 'Team Assignment',
      shuffling:
        'Shuffling {count} members into {teams} teams...\n\n[{candidates}]',
      result: 'Team Assignment Result',
      resultDesc: '{count} members divided into {teams} teams!',
      teamName: 'Team {number} ({count} members)',
      noMembers: 'No members',
      footer: 'Members from {channel}',
    },
    errors: {
      notInVoice: 'Not in Voice Channel',
      notInVoiceDesc: 'You must be in a voice channel to use this command.',
      noMembers: 'No Members',
      noMembersDesc:
        'No members found in the voice channel (bots are excluded).',
      notEnough: 'Not Enough Members',
      notEnoughDesc:
        'Need at least {required} members for {teams} teams.\nCurrent members: {current} (bots excluded)',
    },
  },

  ping: {
    title: 'Pong!',
    latency: 'Latency',
    apiLatency: 'API Latency',
  },

  poll: {
    title: 'Poll',
    created: 'Poll Created',
    ended: 'Poll Ended',
    votes: '{count} votes',
    noVotes: 'No votes',
    anonymous: 'Anonymous poll',
    total: 'Total: {count} votes',
    endsIn: 'Ends in {duration} minute(s)',
    voteChanged: 'Vote changed from "{from}" to "{to}"',
    alreadyVoted: 'You already voted for "{option}"',
    votedFor: 'Voted for "{option}"',
    endedMessage: 'Your poll has been ended and results are now final.',
    noActivePoll: 'No Active Poll',
    noActivePollDesc: 'You do not have an active poll in this channel.',
    errors: {
      notEnoughOptions: 'A poll needs at least 2 options.',
      tooManyOptions: 'A poll can have at most 10 options.',
      maxActivePolls: 'Poll Limit Reached',
      maxActivePollsDesc:
        'There are already {count} active polls. Please end an existing poll before creating a new one.',
      invalidOption: 'Invalid vote option.',
      pollEnded: 'Poll Ended',
      pollEndedDesc: 'This poll has ended or no longer exists.',
      pollError: 'Poll Error',
      pollErrorDesc: 'An error occurred while processing your vote.',
    },
  },

  steam: {
    profile: {
      title: 'Steam Profile',
      status: 'Status',
      level: 'Level',
      games: 'Games',
      playtime: 'Total Playtime',
      recentActivity: 'Recent Activity',
      profileInfo: 'Profile Info',
      realName: 'Real Name',
      country: 'Country',
      memberSince: 'Member Since',
      steamId: 'Steam ID',
      profileLink: 'Profile Link',
      viewOnSteam: 'View on Steam',
      publicProfile: 'Public Profile',
      privateProfile: 'Private Profile',
      privacyNote: 'Some information may be hidden due to privacy settings.',
      playing: 'Playing',
    },
    register: {
      title: 'Account Linked',
      success: 'Your Steam account **{name}** has been linked!',
      alreadyRegistered:
        'You already have a linked Steam account.\nUse `/steam unregister` first to change accounts.',
      confirm: 'Link this account?',
      confirmDesc: 'Steam Account: **{name}**\nSteam ID: `{steamId}`',
      validFormats:
        '**Valid formats:**\n• Steam ID: `76561198xxxxxxxxx`\n• Custom URL: `customname`\n• Profile URL: `https://steamcommunity.com/id/customname`',
      linked: 'Your Discord account is now linked to Steam!',
      updated: 'Your linked Steam account has been updated.',
      viewProfile: 'View Profile',
    },
    unregister: {
      title: 'Account Unlinked',
      success: 'Your Steam account has been unlinked.',
      notRegistered: 'You do not have a linked Steam account.',
      confirm: 'Unlink your Steam account?',
      confirmDesc: 'Currently linked to: **{name}** (`{steamId}`)',
      unlinked: 'Your Discord account has been unlinked from Steam.',
      removedAccount: 'Removed Account',
    },
    whoami: {
      title: 'Linked Account',
      notRegistered:
        'You do not have a linked Steam account.\nUse `/steam register` to link your account.',
      info: 'Linked to: **{name}**\nSteam ID: `{steamId}`\nRegistered: {date}',
      linkedSince: 'Linked Since',
      viewProfile: 'View Profile',
    },
    ranking: {
      title: 'Server Ranking',
      noData: 'No ranking data available.',
      totalPlaytime: 'Total Playtime',
      periodGain: 'Gain ({period})',
      noRegistered: 'No users have registered their Steam accounts.',
      loading: 'Fetching playtime data for {count} users...',
      combined: 'Combined',
      average: 'Average',
      page: 'Page {current} / {total}',
      couldNotRetrieve: 'Could not retrieve playtime data.',
      totalPlayers: 'Total Players',
    },
    history: {
      title: 'Playtime History',
      noData: 'No history data available.',
      period: 'Period',
      gain: 'Gain',
      currentTotal: 'Current Total',
      playtimeAdded: 'Playtime Added',
      howItWorks: 'How This Works',
      recordedDaily: 'Playtime is recorded daily at midnight (JST).',
      trackedFrom: 'History is tracked from registration date',
      notEnoughData: 'Not enough history data available.',
      currentTotalPlaytime: 'Current Total Playtime',
      periods: {
        day: '24 Hours',
        week: '7 Days',
        month: '30 Days',
        threeMonths: '3 Months',
        sixMonths: '6 Months',
        year: '1 Year',
      },
    },
    games: {
      title: 'Game Library',
      totalGames: 'Total Games',
      noGames: '{name} has no games.',
      top5: 'Top 5 Games',
    },
    playtime: {
      title: 'Playtime Stats',
      total: 'Total Playtime',
      last2Weeks: 'Last 2 Weeks',
      topGames: 'Top {count} Games',
    },
    recent: {
      title: 'Recent Activity',
      noRecent: 'No recent activity.',
      dailyAverage: 'Daily Average',
    },
    ui: {
      profileTab: 'Profile',
      playtimeTab: 'Playtime',
      recentTab: 'Recent',
      gamesTab: 'Games',
      sortPlaceholder: 'Choose library sort',
      sortPlaytime: 'Playtime',
      sortRecent: 'Recently played',
      sortAlphabetical: 'Alphabetical',
      showingTop: 'Showing top {count}',
      sortedBy: 'Sorted by: {sort}',
    },
    notify: {
      title: 'Notifications',
      enabled: 'Notifications enabled.',
      disabled: 'Notifications disabled.',
      setup: 'Notification channel set to <#{channel}>',
      howItWorks: 'How it works',
      howItWorksDesc:
        'Registered users will be notified when they start a game\nChecks run every 5 minutes\nUsers can opt-out with `/steam notifications me action:off`',
      statusOn: 'ON',
      statusOff: 'OFF',
      yourStatus: 'Your notification status: {status}',
      serverStatus: 'Server notifications: {status}',
      channel: 'Channel',
      configured: 'Configured',
      notSetup:
        'Notifications are not set up for this server.\n\nUse `/steam notifications setup` to configure.',
      setupFirst: 'Please run `/steam notifications setup` first.',
      noSettings: 'There are no notification settings to remove.',
      nowEnabled: 'Game notifications are now **enabled** for this server.',
      nowDisabled: 'Game notifications are now **disabled** for this server.',
      removed: 'Notification settings have been removed for this server.',
      meStatus: 'Your notification status',
      meEnabled: 'You will be mentioned when you start playing a game.',
      meDisabled: 'You have opted out of game notifications.',
      meNowEnabled: 'You will now receive game start notifications.',
      meNowDisabled: 'You will no longer receive game start notifications.',
    },
    nowPlaying: {
      title: 'Now Playing',
      noPlayers: 'No members are currently playing games.',
    },
    help: {
      title: 'Steam Commands',
      description:
        'Link your Discord account to Steam for easy access to your stats!',
      accountSection: 'Account',
      accountCommands:
        '`/steam register <steamid>` - Link account\n`/steam unregister` - Unlink account\n`/steam whoami` - Show linked account',
      statsSection: 'Stats',
      statsCommands:
        '`/steam profile` - View profile\n`/steam playtime [game]` - View playtime\n`/steam games` - Browse library\n`/steam recent` - Recent activity\n`/steam ranking` - Server leaderboard\n`/steam history` - Playtime over time',
      optionsSection: 'Options',
      optionsDesc:
        '• `steamid` - Look up any Steam user\n• `user` - Look up a Discord user\n• `game` - Search for a specific game',
      autocompleteHint: 'Use Tab to autocomplete game names!',
    },
    chart: {
      title: 'Playtime Chart',
      topNGames: 'Top {count} Games',
      totalPlaytime: 'Total Playtime',
      playtimeAxis: 'Playtime (hours)',
      totalPlaytimeAxis: 'Total Playtime (hours)',
    },
    historyGraph: {
      title: 'Playtime History Graph',
      period: 'Period',
      playtimeAdded: 'Playtime Added',
      playtimeChange: 'Playtime Change',
      recordedDaily: 'History is recorded daily at midnight (JST)',
      periodLabels: {
        sevenDays: '7 Days',
        thirtyDays: '30 Days',
        ninetyDays: '90 Days',
        oneYear: '1 Year',
      },
    },
    errors: {
      userNotFound: 'Steam user not found.',
      invalidSteamId: 'Invalid Steam ID format.',
      couldNotResolve: 'Could not resolve Steam ID.',
      userNotLinked: '**{name}** has not linked their Steam account.',
      notLinked:
        "You haven't linked your Steam account yet.\nUse `/steam register` to link your account.",
      couldNotRetrieve: 'Could not retrieve Steam profile information.',
      privateProfile: '**{name}** has a private profile.',
      apiError: 'Failed to fetch Steam data. Please try again later.',
      notRegistered:
        'You need to register your Steam account first.\nUse `/steam register` to link your account.',
      gameNotFound: 'Could not find a game matching **"{game}"**.',
      onlyCommandUser: 'Only the command user can navigate.',
      cancelled: 'Action cancelled.',
      timeout: 'Action timed out.',
      apiKeyNotConfigured:
        'Steam API key is not configured. Please ask the bot administrator to set `STEAM_API_KEY`.',
    },
    status: {
      online: 'Online',
      offline: 'Offline',
      away: 'Away',
      busy: 'Busy',
      inGame: 'In-Game',
      private: 'Private',
      public: 'Public',
      snooze: 'Snooze',
      lookingToTrade: 'Looking to Trade',
      lookingToPlay: 'Looking to Play',
      unknown: 'Unknown',
    },
    buttons: {
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
  },

  admin: {
    reload: {
      title: 'Commands Reloaded',
      success: 'All commands have been reloaded.',
    },
    deploy: {
      title: 'Commands Deployed',
      success: 'All commands have been deployed to Discord.',
    },
    role: {
      add: {
        success: 'Role Added',
        successDesc: 'Added role **{role}** to **{user}**.',
      },
      remove: {
        success: 'Role Removed',
        successDesc: 'Removed role **{role}** from **{user}**.',
      },
      errors: {
        noPermission:
          'You need the "Manage Roles" permission to use this command.',
        memberNotFound: 'Member not found.',
        roleHierarchy:
          "Cannot manage roles higher than the bot's highest role.",
        alreadyHasRole: 'This member already has that role.',
        doesNotHaveRole: 'This member does not have that role.',
        failed: 'Failed to modify role.',
      },
    },
  },

  help: {
    title: 'Command List',
    description:
      'List of available commands. Use `/general help` with a command name for details.',
    usage: 'Usage',
    footer: 'Use /general help for details',
    commandNotFound: 'Command Not Found',
    commandNotFoundDesc: 'Command `{command}` does not exist.',
    permission: {
      everyone: 'Everyone',
      manageGuild: 'Manage Server',
      manageRoles: 'Manage Roles',
      owner: 'Bot Owner',
    },
    filteredFooter: 'Showing only commands you can use',
    selectCategory: 'Select a category...',
    showAll: 'Show All',
    onlyCommandUser: 'Only the command user can interact.',
  },

  notification: {
    voice: {
      setTitle: 'VC Notifications Configured',
      set: 'Voice channel notifications will be sent to <#{channel}>',
      removedTitle: 'VC Notifications Disabled',
      removed: 'Voice channel notifications have been disabled.',
    },
    welcome: {
      setTitle: 'Welcome Notifications Configured',
      set: 'Member join notifications will be sent to <#{channel}>',
      removedTitle: 'Welcome Notifications Disabled',
      removed: 'Member join notifications have been disabled.',
    },
    status: {
      title: 'Notification Settings',
      voiceLabel: 'VC Join/Leave',
      welcomeLabel: 'Member Join',
      disabled: 'Not configured',
    },
    stats: {
      title: 'Your VC Statistics',
      noData: 'No VC session data found.',
      total: 'Total',
      period: 'Period',
      periods: {
        today: 'Today',
        week: 'This week',
        month: 'This month',
        all: 'All time',
      },
    },
    events: {
      voiceJoin: '**{name}** joined <#{channel}>',
      voiceLeave: '**{name}** left <#{channel}>',
      memberJoinTitle: 'Welcome!',
      memberJoin: '**{name}** joined the server!',
      memberCount: 'Member Count',
    },
    errors: {
      textChannelOnly: 'Please select a text channel.',
      notConfigured: 'No notification settings to remove.',
    },
  },

  github: {
    pr: {
      list: {
        title: 'Pull Requests',
        noPrs: 'No pull requests found',
        open: 'Open',
        closed: 'Closed',
      },
      view: {
        title: 'PR #{number}',
        state: 'State',
        author: 'Author',
        base: 'Base',
        head: 'Head',
        mergeable: 'Mergeable',
        changes: 'Changes',
        files: 'files',
        labels: 'Labels',
      },
      create: {
        success: 'PR Created',
        successDesc: 'Created **{title}**.',
        modalTitle: 'Create Pull Request',
      },
      merge: {
        success: 'PR Merged',
        successDesc: 'Merged PR #{number}.',
        confirmTitle: 'Confirm Merge',
        confirmDesc: 'Merge PR **#{number}** using **{method}**?',
        confirmButton: 'Merge',
        merging: 'Merging...',
      },
    },
    issue: {
      list: {
        title: 'Issues',
        noIssues: 'No issues found',
      },
      view: {
        title: 'Issue #{number}',
        state: 'State',
        author: 'Author',
        assignees: 'Assignees',
        labels: 'Labels',
        milestone: 'Milestone',
      },
      create: {
        success: 'Issue Created',
        successDesc: 'Created **{title}**.',
        modalTitle: 'Create Issue',
      },
    },
    repo: {
      info: {
        title: 'Repository Info',
        description: 'Description',
        stars: 'Stars',
        forks: 'Forks',
        language: 'Language',
        defaultBranch: 'Default Branch',
        noDesc: 'No description',
      },
    },
    modal: {
      titleLabel: 'Title',
      bodyLabel: 'Description',
      bodyPlaceholder: 'Optional. You can add more details on GitHub later.',
      headLabel: 'Head branch (source)',
      baseLabel: 'Base branch (target)',
    },
    errors: {
      tokenNotSet:
        'GITHUB_TOKEN is not configured. Ask the bot administrator to set it.',
      noPermission:
        'You need "Manage Server" permission or be a bot owner to use this command.',
      invalidRepo: 'Invalid repository format. Use `owner/name`.',
      notFound: 'Repository, PR, or Issue not found.',
      isPullRequest: 'This number is a PR. Use `/github pr view` instead.',
      forbidden: 'Insufficient permissions. Check your token scopes.',
      conflict: 'Cannot merge (conflict or branch protection).',
      apiError: 'GitHub API error: {message}',
    },
  },

  record: {
    title: 'Recording',
    recording: 'Recording...',
    recordingDesc: 'Recording {duration} of past audio.',
    success: 'Recording Complete',
    successDesc: 'Recorded {duration} of past audio.',
    processing: 'Processing recording file...',
    errors: {
      notInVoice: 'Not in Voice Channel',
      notInVoiceDesc: 'You must be in a voice channel to use this command.',
      botNotInVoice: 'Bot Not in Voice Channel',
      botNotInVoiceDesc: 'Bot is not connected to this voice channel.',
      invalidDuration: 'Invalid Duration',
      invalidDurationDesc: 'Invalid duration format. Examples: 30s, 1m, 5m',
      durationTooLong: 'Duration Too Long',
      durationTooLongDesc: 'Maximum recording duration is {max} seconds.',
      durationExceedsBuffer: 'Duration Exceeds Buffer',
      durationExceedsBufferDesc:
        'Specified duration exceeds buffer range ({buffer} seconds).',
      noPermission: 'No Permission',
      noPermissionDesc: 'Bot does not have permission to send files.',
      connectionLimit: 'Connection Limit',
      connectionLimitDesc: 'Maximum concurrent connections reached.',
      recordingInProgress: 'Recording In Progress',
      recordingInProgressDesc:
        'Recording is already in progress for this channel.',
      failed: 'Recording Failed',
      failedDesc: 'An error occurred while processing the recording: {error}',
    },
  },
};
