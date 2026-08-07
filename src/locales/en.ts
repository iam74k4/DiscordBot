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
    nextStep: 'Next step',
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
    panel: {
      languagePlaceholder: 'Choose a language...',
      auditPlaceholder: 'Choose an audit channel...',
      clearAudit: 'Clear Audit Channel',
      overviewFooter: 'Manage language, audit, and logs from this panel',
      languageFooter: 'Select a language below to update immediately',
      auditFooter: 'Choose a channel below or clear the current setting',
    },
  },

  server: {
    stats: {
      title: 'Server Statistics',
      members: 'Members',
      total: 'Total',
      online: 'Online',
      offline: 'Offline',
      bots: 'Bots',
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
      tooManyOptions: 'A poll can have at most 5 options.',
      questionTooLong: 'Question must be 256 characters or less.',
      optionTooLong: 'Each option must be 100 characters or less.',
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
        botRoleHierarchy:
          "Cannot manage roles higher than the bot's highest role.",
        actorRoleHierarchy:
          'You can only manage roles lower than your highest role.',
        targetMemberHierarchy:
          'You can only manage members with a lower highest role than yours.',
        botTargetMemberHierarchy:
          "Cannot manage members at or above the bot's highest role.",
        alreadyHasRole: 'This member already has that role.',
        doesNotHaveRole: 'This member does not have that role.',
        failed: 'Failed to modify role.',
      },
    },
    panel: {
      statsTab: 'Stats',
      dbTab: 'DB',
      guildsTab: 'Guilds',
      healthTab: 'Health',
      metricsTab: 'Metrics',
      backupsTab: 'Backups',
      refresh: 'Refresh',
      runBackup: 'Run Backup',
      statsTitle: 'Bot Statistics',
      dbTitle: 'Database Statistics',
      guildsTitle: 'Server List',
      healthTitle: 'System Health Check',
      metricsTitle: 'Bot Metrics',
      backupsTitle: 'Database Backups',
      backupsFooter: 'Use the button below to run a manual backup',
      serversLabel: 'Servers',
      usersLabel: 'Users',
      channelsLabel: 'Channels',
      uptimeLabel: 'Uptime',
      memoryLabel: 'Memory',
      nodeLabel: 'Node.js',
      registeredUsersLabel: 'Registered Users',
      tablesLabel: 'Tables',
      backupSuccess: 'Backup created: `{filename}` ({size} KB)',
      backupFailure: 'Backup failed: {error}',
    },
  },

  owner: {
    errors: {
      ownerOnly: 'Only the bot owner can use this command.',
    },
    broadcast: {
      confirm:
        'This will DM the message below to up to {count} server owners.\n\n{message}',
      progress:
        'Broadcast in progress... {processed}/{total}{capNote} (sent {sent}, failed {failed})',
      complete: 'Broadcast complete\nSent: {sent}\nFailed: {failed}{capNote}',
      capNote:
        '\n\nNote: only the first {limit} of {total} guilds were processed.',
    },
    backup: {
      confirm:
        'A manual database backup will be created immediately. Continue?',
      complete:
        'Backup created successfully.\n\n**Filename:** `{filename}`\n**Size:** {size} KB',
      failed: 'Backup failed: {error}',
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
      nextStep:
        'Next step: use `/notification status` to review all notification settings together.',
      disabledHint:
        'Next step: use `/notification voice set` to re-enable VC notifications later.',
    },
    welcome: {
      setTitle: 'Welcome Notifications Configured',
      set: 'Member join notifications will be sent to <#{channel}>',
      removedTitle: 'Welcome Notifications Disabled',
      removed: 'Member join notifications have been disabled.',
      nextStep:
        'Next step: use `/notification status` to review all notification settings together.',
      disabledHint:
        'Next step: use `/notification welcome set` to enable member join messages again.',
    },
    status: {
      title: 'Notification Settings',
      voiceLabel: 'VC Join/Leave',
      welcomeLabel: 'Member Join',
      disabled: 'Not configured',
    },
    panel: {
      statusTab: 'Settings',
      statsTab: 'Stats',
      periodPlaceholder: 'Choose a stats period...',
      voicePlaceholder: 'Select a channel for VC notifications...',
      welcomePlaceholder: 'Select a channel for welcome notifications...',
      removeVoice: 'Disable VC Notifications',
      removeWelcome: 'Disable Welcome Notifications',
      statusDescription:
        'You can update notification channels directly from this panel.',
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
      channelNotSendable:
        'The bot cannot send messages to that channel. Please choose another text channel.',
      manageGuildRequired:
        'You need the "Manage Server" permission to change server notification settings.',
    },
  },

  record: {
    title: 'Recording',
    recording: 'Recording...',
    recordingDesc: 'Recording {duration} of past audio.',
    success: 'Recording Complete',
    successDesc: 'Recorded {duration} of past audio.',
    processing: 'Processing recording file...',
    successNextStep:
      'Need capacity details? Use `/voice status` to check active connections and the limit.',
    durationNote:
      'Tip: recordings are limited by the retained audio buffer and 5-minute maximum.',
    statusHint:
      'This status is shown only to you. Use it to check recorder capacity before starting a capture.',
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
        'Specified duration exceeds the retainable audio window ({buffer} seconds).',
      noAudibleAudio: 'No Audible Audio',
      noAudibleAudioDesc:
        'No usable audio was captured in that window. Speak closer to the mic or try a shorter duration.',
      noPermission: 'No Permission',
      noPermissionDesc: 'Bot does not have permission to send files.',
      connectionLimit: 'Connection Limit',
      connectionLimitDesc: 'Maximum concurrent connections reached.',
      recordingInProgress: 'Recording In Progress',
      recordingInProgressDesc:
        'Recording is already in progress for this channel.',
      deliveryIncomplete: 'Recording Delivery Incomplete',
      deliveryIncompleteDesc:
        'Could not deliver split recording part(s) {parts} of {total}. Retry `/record` for the full audio.',
      failed: 'Recording Failed',
      failedDesc: 'An error occurred while processing the recording: {error}',
    },
  },
};
