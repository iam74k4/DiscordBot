import type { TranslationKeys } from './types.js';

/**
 * Japanese translations
 */
export const ja: TranslationKeys = {
  common: {
    error: 'エラー',
    warning: '警告',
    success: '成功',
    loading: '読み込み中...',
    notFound: '見つかりません',
    guildOnly: 'このコマンドはサーバー内でのみ使用できます。',
    noPermission: 'このコマンドを使用する権限がありません。',
    status: 'ステータス',
    noData: 'データなし',
    unexpectedError: 'コマンドの実行中に予期しないエラーが発生しました。',
    cooldown: '`/{command}` を再使用するには {time} 秒お待ちください。',
    commandBlocked: 'コマンドがブロックされました',
    permissionsRequired: '次の権限が必要です: {permissions}',
    permissionsUnverifiable: '権限を確認できません。',
    confirm: '確認',
    cancel: 'キャンセル',
    confirmMessage: '本当に実行しますか？',
    timeout: 'この操作はタイムアウトしました。',
    cancelled: 'キャンセルしました。',
    nextStep: '次のおすすめ',
  },

  units: {
    hours: '時間',
    hoursPerPlayer: '時間/人',
    perDay: '日',
    minutes: '分',
    hoursAndMinutes: '{hours}時間 {minutes}分',
  },

  settings: {
    title: 'サーバー設定',
    updated: '設定を更新しました',
    language: {
      name: '言語',
      changed: '言語を {language} に変更しました',
      current: '現在の言語',
    },
    audit: {
      name: '監査ログチャンネル',
      notSet: '未設定',
      configured: '監査ログを <#{channel}> に送信します',
      disabled: '監査ログチャンネルを削除しました。',
    },
    logs: {
      title: '監査ログ',
      noLogs: 'このサーバーの監査ログはありません。',
      showing: '{total}件中{count}件を表示',
    },
    view: {
      footer: '/admin settings で変更可能',
    },
    howToChange: '変更方法',
    selectSetting: '設定項目を選択...',
    overview: '概要',
    panel: {
      languagePlaceholder: '言語を選択...',
      auditPlaceholder: '監査ログのチャンネルを選択...',
      clearAudit: '監査チャンネルを解除',
      overviewFooter: 'このパネルから言語・監査・ログを管理できます',
      languageFooter: '下のセレクトから即時に言語を更新できます',
      auditFooter: '下のセレクトで設定、または現在の設定を解除できます',
    },
  },

  server: {
    stats: {
      title: 'サーバー統計',
      members: 'メンバー',
      total: '合計',
      online: 'オンライン',
      offline: 'オフライン',
      bots: 'Bot',
      steam: {
        title: 'Steam連携',
        registered: '登録済み',
        playtime: '合計プレイ時間',
        topPlayers: 'Steamプレイヤーランキング',
      },
    },
  },

  roulette: {
    member: {
      title: 'ルーレット',
      countdown: '{count}...',
      selecting: '候補から選択中...\n\n[{candidates}]',
      result: 'ルーレット結果',
      onlyOne:
        'チャンネルにはメンバーが1人しかいません！\n\n選ばれたのは: {member}',
      footer: '{channel}の{count}人のメンバーから選択',
    },
    team: {
      title: 'チーム分け',
      shuffling:
        '{count}人のメンバーを{teams}チームにシャッフル中...\n\n[{candidates}]',
      result: 'チーム分け結果',
      resultDesc: '{count}人のメンバーを{teams}チームに分けました！',
      teamName: 'チーム{number} ({count}人)',
      noMembers: 'メンバーなし',
      footer: '{channel}のメンバー',
    },
    errors: {
      notInVoice: 'ボイスチャンネル未参加',
      notInVoiceDesc:
        'このコマンドを使用するにはボイスチャンネルに参加してください。',
      noMembers: 'メンバーがいません',
      noMembersDesc: 'ボイスチャンネルにメンバーがいません（Botは除外）。',
      notEnough: 'メンバーが不足しています',
      notEnoughDesc:
        '{teams}チームには最低{required}人のメンバーが必要です。\n現在のメンバー: {current}人（Bot除外）',
    },
  },

  ping: {
    title: 'Pong!',
    latency: 'レイテンシ',
    apiLatency: 'API レイテンシ',
  },

  poll: {
    title: '投票',
    created: '投票を作成しました',
    ended: '投票が終了しました',
    votes: '{count}票',
    noVotes: '投票なし',
    anonymous: '匿名投票',
    total: '合計: {count}票',
    endsIn: '{duration}分後に終了',
    voteChanged: '「{from}」から「{to}」に投票を変更しました',
    alreadyVoted: '既に「{option}」に投票しています',
    votedFor: '「{option}」に投票しました',
    endedMessage: '投票を終了しました。結果が確定しました。',
    noActivePoll: '有効な投票がありません',
    noActivePollDesc: 'このチャンネルに有効な投票がありません。',
    errors: {
      notEnoughOptions: '投票には最低2つの選択肢が必要です。',
      tooManyOptions: '投票の選択肢は最大5個までです。',
      questionTooLong: '質問は256文字以内にしてください。',
      optionTooLong: '各選択肢は100文字以内にしてください。',
      maxActivePolls: '投票数上限',
      maxActivePollsDesc:
        '有効な投票が既に{count}件あります。新しい投票を作成する前に既存の投票を終了してください。',
      invalidOption: '無効な投票オプションです。',
      pollEnded: '投票終了',
      pollEndedDesc: 'この投票は終了したか、存在しません。',
      pollError: '投票エラー',
      pollErrorDesc: '投票の処理中にエラーが発生しました。',
    },
  },

  steam: {
    profile: {
      title: 'Steamプロフィール',
      status: 'ステータス',
      level: 'レベル',
      games: 'ゲーム数',
      playtime: '総プレイ時間',
      recentActivity: '最近のアクティビティ',
      profileInfo: 'プロフィール情報',
      realName: '本名',
      country: '国',
      memberSince: '登録日',
      steamId: 'Steam ID',
      profileLink: 'プロフィールリンク',
      viewOnSteam: 'Steamで見る',
      publicProfile: '公開プロフィール',
      privateProfile: '非公開プロフィール',
      privacyNote:
        'プライバシー設定により一部の情報が非表示になっている可能性があります。',
      playing: 'プレイ中',
    },
    register: {
      title: 'アカウント連携完了',
      success: 'Steamアカウント **{name}** を連携しました！',
      alreadyRegistered:
        '既にSteamアカウントが連携されています。\nアカウントを変更するには先に `/steam unregister` を実行してください。',
      confirm: 'このアカウントを連携しますか？',
      confirmDesc: 'Steamアカウント: **{name}**\nSteam ID: `{steamId}`',
      validFormats:
        '**有効な形式:**\n• Steam ID: `76561198xxxxxxxxx`\n• カスタムURL: `customname`\n• プロフィールURL: `https://steamcommunity.com/id/customname`',
      linked: 'DiscordアカウントがSteamに連携されました！',
      updated: '連携済みSteamアカウントが更新されました。',
      viewProfile: 'プロフィールを見る',
      nextStep:
        '`/steam user profile` でプロフィール確認、`/steam account whoami` で連携状況の再確認ができます。',
    },
    unregister: {
      title: 'アカウント連携解除',
      success: 'Steamアカウントの連携を解除しました。',
      notRegistered: 'Steamアカウントが連携されていません。',
      confirm: 'Steamアカウントの連携を解除しますか？',
      confirmDesc: '現在の連携先: **{name}** (`{steamId}`)',
      unlinked: 'DiscordアカウントのSteam連携を解除しました。',
      removedAccount: '削除されたアカウント',
      nextStep:
        '別アカウントを連携したい場合は `/steam account register` を実行してください。',
    },
    whoami: {
      title: '連携アカウント',
      notRegistered:
        'Steamアカウントが連携されていません。\n`/steam register` で連携してください。',
      info: '連携先: **{name}**\nSteam ID: `{steamId}`\n登録日: {date}',
      linkedSince: '連携日',
      viewProfile: 'プロフィールを見る',
      nextStep:
        '`/steam user recent` で最近の活動、`/steam stats ranking` でサーバーランキングを確認できます。',
    },
    ranking: {
      title: 'サーバーランキング',
      noData: 'ランキングデータがありません。',
      totalPlaytime: '総プレイ時間',
      periodGain: '増加量 ({period})',
      noRegistered: 'Steamアカウントを登録しているユーザーがいません。',
      loading: '{count}人のユーザーのプレイ時間データを取得中...',
      combined: '合計',
      average: '平均',
      page: 'ページ {current} / {total}',
      couldNotRetrieve: 'プレイ時間データを取得できませんでした。',
      totalPlayers: '参加者数',
    },
    history: {
      title: 'プレイ時間履歴',
      noData: '履歴データがありません。',
      period: '期間',
      gain: '増加量',
      currentTotal: '現在の合計',
      playtimeAdded: 'プレイ時間の増加',
      howItWorks: '仕組み',
      recordedDaily: 'プレイ時間は毎日深夜（JST）に記録されます。',
      trackedFrom: '履歴は登録日から記録されます',
      notEnoughData: '十分な履歴データがありません。',
      currentTotalPlaytime: '現在の総プレイ時間',
      periods: {
        day: '24時間',
        week: '7日間',
        month: '30日間',
        threeMonths: '3ヶ月',
        sixMonths: '6ヶ月',
        year: '1年',
      },
    },
    games: {
      title: 'ゲームライブラリ',
      totalGames: 'ゲーム数',
      noGames: '{name}はゲームを持っていません。',
      top5: 'トップ5ゲーム',
    },
    playtime: {
      title: 'プレイ時間統計',
      total: '総プレイ時間',
      last2Weeks: '過去2週間',
      topGames: 'トップ{count}ゲーム',
    },
    recent: {
      title: '最近のアクティビティ',
      noRecent: '最近のアクティビティはありません。',
      dailyAverage: '1日平均',
    },
    ui: {
      profileTab: 'プロフィール',
      playtimeTab: 'プレイ時間',
      recentTab: '最近の活動',
      gamesTab: 'ゲーム一覧',
      sortPlaceholder: '並び順を選択',
      sortPlaytime: 'プレイ時間順',
      sortRecent: '最近プレイ順',
      sortAlphabetical: '名前順',
      showingTop: '上位 {count} 件を表示',
      sortedBy: '並び順: {sort}',
    },
    notify: {
      title: '通知設定',
      enabled: '通知を有効にしました。',
      disabled: '通知を無効にしました。',
      setup: '通知チャンネルを <#{channel}> に設定しました',
      howItWorks: '仕組み',
      howItWorksDesc:
        '登録ユーザーがゲームを開始すると通知されます\n5分ごとにチェックします\nユーザーは `/notification steam me action:off` でオプトアウトできます',
      statusOn: 'オン',
      statusOff: 'オフ',
      yourStatus: 'あなたの通知状態: {status}',
      serverStatus: 'サーバー通知: {status}',
      channel: 'チャンネル',
      configured: '設定済み',
      notSetup:
        'このサーバーでは通知が設定されていません。\n\n`/notification steam setup` で設定してください。',
      setupFirst: '先に `/notification steam setup` を実行してください。',
      noSettings: '削除する通知設定がありません。',
      nowEnabled: 'このサーバーのゲーム通知を**有効**にしました。',
      nowDisabled: 'このサーバーのゲーム通知を**無効**にしました。',
      removed: 'このサーバーの通知設定を削除しました。',
      meStatus: 'あなたの通知状態',
      meEnabled: 'ゲームを開始するとメンションされます。',
      meDisabled: 'ゲーム通知をオプトアウトしています。',
      meNowEnabled: 'ゲーム開始通知を受け取るようになりました。',
      meNowDisabled: 'ゲーム開始通知を受け取らなくなりました。',
      setupHint:
        '次は `/notification steam enable` でサーバー全体の配信を有効にできます。',
      enableHint:
        '次は `/notification steam status` で通知先チャンネルと現在の状態を確認できます。',
      disableHint:
        'チャンネル設定を残したまま再開したいときは `/notification steam enable` を使ってください。',
      removeHint:
        '最初から設定し直す場合は `/notification steam setup` を使ってください。',
      meStatusHint:
        'この場で切り替えるには `/notification steam me action:on` または `:off` を使えます。',
      meEnableHint:
        '現在の設定を見直すには `/notification steam me action:status` を使えます。',
      meDisableHint:
        '再度受け取りたくなったら `/notification steam me action:on` を使ってください。',
    },
    nowPlaying: {
      title: 'プレイ中',
      noPlayers: '現在ゲームをプレイしているメンバーはいません。',
    },
    help: {
      title: 'Steamコマンド一覧',
      description: 'DiscordアカウントをSteamに連携して、統計に簡単アクセス！',
      accountSection: 'アカウント',
      accountCommands:
        '`/steam account register <steamid>` - アカウント連携\n`/steam account unregister` - 連携解除\n`/steam account whoami` - 連携アカウントを表示',
      statsSection: '統計',
      statsCommands:
        '`/steam user profile` - プロフィールを表示\n`/steam user playtime [game]` - プレイ時間を表示\n`/steam user games` - ライブラリを閲覧\n`/steam user recent` - 最近のアクティビティ\n`/steam stats ranking` - サーバーランキング\n`/steam stats history` - プレイ時間の推移',
      optionsSection: 'オプション',
      optionsDesc:
        '• `steamid` - 任意のSteamユーザーを検索\n• `user` - Discordユーザーを検索\n• `game` - 特定のゲームを検索',
      autocompleteHint: 'Tabキーでゲーム名を自動補完！',
    },
    chart: {
      title: 'プレイ時間チャート',
      topNGames: 'トップ{count}ゲーム',
      totalPlaytime: '総プレイ時間',
      playtimeAxis: 'プレイ時間（時間）',
      totalPlaytimeAxis: '総プレイ時間（時間）',
    },
    historyGraph: {
      title: 'プレイ時間グラフ',
      period: '期間',
      playtimeAdded: 'プレイ時間増加',
      playtimeChange: 'プレイ時間変化',
      recordedDaily: '履歴は毎日深夜（JST）に記録されます',
      periodLabels: {
        sevenDays: '7日間',
        thirtyDays: '30日間',
        ninetyDays: '90日間',
        oneYear: '1年',
      },
    },
    errors: {
      userNotFound: 'Steamユーザーが見つかりません。',
      invalidSteamId: '無効なSteam ID形式です。',
      couldNotResolve: 'Steam IDを解決できませんでした。',
      userNotLinked: '**{name}**はSteamアカウントを連携していません。',
      notLinked:
        'Steamアカウントが連携されていません。\n`/steam register` で連携してください。',
      couldNotRetrieve: 'Steamプロフィール情報を取得できませんでした。',
      privateProfile: '**{name}**のプロフィールは非公開です。',
      apiError:
        'Steamデータの取得に失敗しました。しばらくしてからお試しください。',
      notRegistered:
        'Steamアカウントの登録が必要です。\n`/steam register` で連携してください。',
      gameNotFound: '**「{game}」**に一致するゲームが見つかりませんでした。',
      onlyCommandUser: 'コマンドを実行したユーザーのみ操作できます。',
      cancelled: 'キャンセルしました。',
      timeout: 'タイムアウトしました。',
      apiKeyNotConfigured:
        'Steam API Keyが設定されていません。Bot管理者に `STEAM_API_KEY` の設定を依頼してください。',
    },
    status: {
      online: 'オンライン',
      offline: 'オフライン',
      away: '離席中',
      busy: '取り込み中',
      inGame: 'ゲーム中',
      private: '非公開',
      public: '公開',
      snooze: 'スヌーズ',
      lookingToTrade: 'トレード希望',
      lookingToPlay: 'プレイ希望',
      unknown: '不明',
    },
    buttons: {
      confirm: '確認',
      cancel: 'キャンセル',
    },
  },

  admin: {
    reload: {
      title: 'コマンド再読み込み',
      success: 'すべてのコマンドを再読み込みしました。',
    },
    deploy: {
      title: 'コマンドデプロイ',
      success: 'すべてのコマンドをDiscordにデプロイしました。',
    },
    role: {
      add: {
        success: 'ロールを付与しました',
        successDesc: '**{user}** にロール **{role}** を付与しました。',
      },
      remove: {
        success: 'ロールを剥奪しました',
        successDesc: '**{user}** からロール **{role}** を剥奪しました。',
      },
      errors: {
        noPermission: 'このコマンドには「ロールの管理」権限が必要です。',
        memberNotFound: 'メンバーが見つかりません。',
        botRoleHierarchy: 'Botの最高ロールより上位のロールは操作できません。',
        actorRoleHierarchy:
          '自分の最高ロールより上位のロールは操作できません。',
        alreadyHasRole: 'このメンバーは既にそのロールを持っています。',
        doesNotHaveRole: 'このメンバーはそのロールを持っていません。',
        failed: 'ロールの操作に失敗しました。',
      },
    },
    panel: {
      statsTab: '統計',
      dbTab: 'DB',
      guildsTab: 'Guilds',
      healthTab: 'Health',
      metricsTab: 'Metrics',
      backupsTab: 'Backups',
      refresh: '更新',
      runBackup: 'バックアップ実行',
      statsTitle: 'Bot統計',
      dbTitle: 'データベース統計',
      guildsTitle: '参加サーバー一覧',
      healthTitle: 'システムヘルスチェック',
      metricsTitle: 'Botメトリクス',
      backupsTitle: 'データベースバックアップ',
      backupsFooter: '下のボタンから手動バックアップを実行できます',
      serversLabel: 'サーバー数',
      usersLabel: 'ユーザー数',
      channelsLabel: 'チャンネル数',
      uptimeLabel: '稼働時間',
      memoryLabel: 'メモリ',
      nodeLabel: 'Node.js',
      registeredUsersLabel: '登録ユーザー数',
      tablesLabel: 'テーブル',
      backupSuccess: 'バックアップを作成しました: `{filename}` ({size} KB)',
      backupFailure: 'バックアップに失敗しました: {error}',
    },
  },

  owner: {
    errors: {
      ownerOnly: 'このコマンドは Bot オーナーのみ使用できます。',
    },
    broadcast: {
      confirm:
        '以下のメッセージを最大 {count} 件のサーバーオーナーへ DM 送信します。\n\n{message}',
      progress:
        '一斉通知を送信中... {processed}/{total}{capNote} (成功 {sent}, 失敗 {failed})',
      complete: '一斉通知が完了しました\n成功: {sent}\n失敗: {failed}{capNote}',
      capNote: '\n\n注: {total} サーバー中、先頭 {limit} 件のみ処理しました。',
    },
    backup: {
      confirm: '手動データベースバックアップを今すぐ作成します。続行しますか？',
      complete:
        'バックアップを作成しました。\n\n**ファイル名:** `{filename}`\n**サイズ:** {size} KB',
      failed: 'バックアップに失敗しました: {error}',
    },
  },

  help: {
    title: 'コマンド一覧',
    description:
      '利用可能なコマンドの一覧です。詳細は `/general help` にコマンド名を指定して確認できます。',
    usage: '使い方',
    footer: '/general help で詳細を表示',
    commandNotFound: 'コマンドが見つかりません',
    commandNotFoundDesc: '`{command}` というコマンドは存在しません。',
    permission: {
      everyone: '全員',
      manageGuild: 'サーバー管理',
      manageRoles: 'ロール管理',
      owner: 'Botオーナー',
    },
    filteredFooter: '実行可能なコマンドのみ表示しています',
    selectCategory: 'カテゴリーを選択...',
    showAll: 'すべて表示',
    onlyCommandUser: 'コマンドを実行したユーザーのみ操作できます。',
  },

  notification: {
    voice: {
      setTitle: 'VC通知設定完了',
      set: 'VC入退室通知を <#{channel}> に送信します',
      removedTitle: 'VC通知無効化',
      removed: 'VC入退室通知を無効にしました。',
      nextStep: '`/notification status` で他の通知設定もまとめて確認できます。',
      disabledHint:
        'あとで再開する場合は `/notification voice set` で再設定してください。',
    },
    welcome: {
      setTitle: 'メンバー参加通知設定完了',
      set: 'メンバー参加通知を <#{channel}> に送信します',
      removedTitle: 'メンバー参加通知無効化',
      removed: 'メンバー参加通知を無効にしました。',
      nextStep: '`/notification status` で他の通知設定もまとめて確認できます。',
      disabledHint:
        '参加通知を再開するには `/notification welcome set` を使ってください。',
    },
    status: {
      title: '通知設定',
      voiceLabel: 'VC入退室',
      welcomeLabel: 'メンバー参加',
      disabled: '未設定',
    },
    panel: {
      statusTab: '設定',
      statsTab: '統計',
      periodPlaceholder: '統計期間を選択...',
      voicePlaceholder: 'VC通知先チャンネルを選択...',
      welcomePlaceholder: '参加通知先チャンネルを選択...',
      removeVoice: 'VC通知を無効化',
      removeWelcome: '参加通知を無効化',
      statusDescription: 'このパネルから通知チャンネルを直接更新できます。',
    },
    stats: {
      title: 'あなたのVC統計',
      noData: 'VCセッションデータがありません。',
      total: '合計',
      period: '期間',
      periods: {
        today: '今日',
        week: '今週',
        month: '今月',
        all: '全期間',
      },
    },
    events: {
      voiceJoin: '**{name}** が <#{channel}> に参加しました',
      voiceLeave: '**{name}** が <#{channel}> から退出しました',
      memberJoinTitle: 'ようこそ！',
      memberJoin: '**{name}** がサーバーに参加しました！',
      memberCount: 'メンバー数',
    },
    errors: {
      textChannelOnly: 'テキストチャンネルを選択してください。',
      notConfigured: '削除する通知設定がありません。',
      channelNotSendable:
        'Bot がそのチャンネルに送信できません。別のテキストチャンネルを選択してください。',
      manageGuildRequired:
        'サーバー通知設定の変更には「サーバーの管理」権限が必要です。',
    },
  },

  record: {
    title: '録音',
    recording: '録音中...',
    recordingDesc: '過去{duration}の音声を録音しています。',
    success: '録音完了',
    successDesc: '過去{duration}の音声を録音しました。',
    processing: '録音ファイルを処理中...',
    successNextStep:
      '接続数や上限を確認したい場合は `/voice status` を使ってください。',
    durationNote: 'ヒント: 録音時間は保持バッファと最大5分の制限を受けます。',
    statusHint:
      'この状態表示は自分だけに見えます。録音前の容量確認に使えます。',
    errors: {
      notInVoice: 'ボイスチャンネル未参加',
      notInVoiceDesc:
        'このコマンドを使用するにはボイスチャンネルに参加してください。',
      botNotInVoice: 'BotがVCに参加していません',
      botNotInVoiceDesc: 'Botがこのボイスチャンネルに参加していません。',
      invalidDuration: '無効な期間',
      invalidDurationDesc: '期間の形式が正しくありません。例: 30s, 1m, 5m',
      durationTooLong: '期間が長すぎます',
      durationTooLongDesc: '最大録音時間は{max}秒です。',
      durationExceedsBuffer: 'バッファ範囲外',
      durationExceedsBufferDesc:
        '指定された期間が保持可能な音声ウィンドウ（{buffer}秒）を超えています。',
      noAudibleAudio: '音声が検出されませんでした',
      noAudibleAudioDesc:
        'その期間に十分な音量の音声がありませんでした。マイクに近づくか、より短い時間で試してください。',
      noPermission: '権限不足',
      noPermissionDesc: 'Botがファイルを送信する権限がありません。',
      connectionLimit: '接続数上限',
      connectionLimitDesc: '同時接続数の上限に達しています。',
      recordingInProgress: '録音中',
      recordingInProgressDesc: 'このチャンネルで既に録音が進行中です。',
      failed: '録音失敗',
      failedDesc: '録音の処理中にエラーが発生しました: {error}',
    },
  },
};
