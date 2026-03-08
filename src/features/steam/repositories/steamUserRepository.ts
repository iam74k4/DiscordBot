import {
  getAllSteamUsers,
  getSteamId,
  getSteamUser,
  getSteamUsersByDiscordIds,
  hasSteamRegistered,
  registerSteamUser,
  unregisterSteamUser,
  type SteamUserRecord,
} from '../../../services/database/index.js';

export type { SteamUserRecord };

export const steamUserRepository = {
  getAll: getAllSteamUsers,
  getByDiscordId: getSteamUser,
  getSteamId,
  getByDiscordIds: getSteamUsersByDiscordIds,
  hasRegistered: hasSteamRegistered,
  register: registerSteamUser,
  unregister: unregisterSteamUser,
};
