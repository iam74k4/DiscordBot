import {
  registerHelpCategory,
  type CommandCategory,
} from '../../shared/help/catalog.js';

export const voiceHelpCategory: CommandCategory = {
  name: { en: 'Voice', ja: 'ボイス' },
  commands: [
    {
      name: 'voice record',
      description: {
        en: 'Record past audio from your voice channel',
        ja: '参加中VCの過去音声を録音',
      },
      usage: '/voice record <duration>',
      requiredPermission: 'manageGuild',
    },
    {
      name: 'voice status',
      description: {
        en: 'Show the voice subsystem status',
        ja: 'ボイス機能の状態を表示',
      },
      usage: '/voice status',
      requiredPermission: 'manageGuild',
    },
  ],
};

registerHelpCategory(voiceHelpCategory);
