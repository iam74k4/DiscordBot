import { registerHelpCategory, type CommandCategory } from '../helpCatalog.js';

export const voiceHelpCategory: CommandCategory = {
  name: { en: 'Voice', ja: 'ボイス' },
  commands: [
    {
      name: 'record',
      description: {
        en: 'Record past audio from voice channel',
        ja: 'ボイスチャンネルの過去音声を録音',
      },
      usage: '/record <duration>',
      requiredPermission: 'everyone',
    },
  ],
};

registerHelpCategory(voiceHelpCategory);
