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
      footer: '/settings で変更可能',
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
      tooManyOptions: '投票の選択肢は最大10個までです。',
      invalidOption: '無効な投票オプションです。',
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
    },
    unregister: {
      title: 'アカウント連携解除',
      success: 'Steamアカウントの連携を解除しました。',
      notRegistered: 'Steamアカウントが連携されていません。',
      confirm: 'Steamアカウントの連携を解除しますか？',
      confirmDesc: '現在の連携先: **{name}** (`{steamId}`)',
      unlinked: 'DiscordアカウントのSteam連携を解除しました。',
      removedAccount: '削除されたアカウント',
    },
    whoami: {
      title: '連携アカウント',
      notRegistered:
        'Steamアカウントが連携されていません。\n`/steam register` で連携してください。',
      info: '連携先: **{name}**\nSteam ID: `{steamId}`\n登録日: {date}',
      linkedSince: '連携日',
      viewProfile: 'プロフィールを見る',
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
    notify: {
      title: '通知設定',
      enabled: '通知を有効にしました。',
      disabled: '通知を無効にしました。',
      setup: '通知チャンネルを <#{channel}> に設定しました',
      howItWorks: '仕組み',
      howItWorksDesc:
        '登録ユーザーがゲームを開始すると通知されます\n5分ごとにチェックします\nユーザーは `/notify me off` でオプトアウトできます',
      statusOn: 'オン',
      statusOff: 'オフ',
      yourStatus: 'あなたの通知状態: {status}',
      serverStatus: 'サーバー通知: {status}',
      channel: 'チャンネル',
      configured: '設定済み',
      notSetup:
        'このサーバーでは通知が設定されていません。\n\n`/notify setup` で設定してください。',
      setupFirst: '先に `/notify setup` を実行してください。',
      noSettings: '削除する通知設定がありません。',
      nowEnabled: 'このサーバーのゲーム通知を**有効**にしました。',
      nowDisabled: 'このサーバーのゲーム通知を**無効**にしました。',
      removed: 'このサーバーの通知設定を削除しました。',
      meStatus: 'あなたの通知状態',
      meEnabled: 'ゲームを開始するとメンションされます。',
      meDisabled: 'ゲーム通知をオプトアウトしています。',
      meNowEnabled: 'ゲーム開始通知を受け取るようになりました。',
      meNowDisabled: 'ゲーム開始通知を受け取らなくなりました。',
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
        '`/steam register <steamid>` - アカウント連携\n`/steam unregister` - 連携解除\n`/steam whoami` - 連携アカウントを表示',
      statsSection: '統計',
      statsCommands:
        '`/steam profile` - プロフィールを表示\n`/steam playtime [game]` - プレイ時間を表示\n`/steam games` - ライブラリを閲覧\n`/steam recent` - 最近のアクティビティ\n`/steam ranking` - サーバーランキング\n`/steam history` - プレイ時間の推移',
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
  },

  help: {
    title: 'コマンド一覧',
    description:
      '利用可能なコマンドの一覧です。詳細は `/help <コマンド名>` で確認できます。',
    usage: '使い方',
    footer: '/help <コマンド名> で詳細を表示',
    commandNotFound: 'コマンドが見つかりません',
    commandNotFoundDesc: '`{command}` というコマンドは存在しません。',
  },

  record: {
    title: '録音',
    recording: '録音中...',
    recordingDesc: '過去{duration}の音声を録音しています。',
    success: '録音完了',
    successDesc: '過去{duration}の音声を録音しました。',
    processing: '録音ファイルを処理中...',
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
        '指定された期間がバッファ範囲（{buffer}秒）を超えています。',
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
