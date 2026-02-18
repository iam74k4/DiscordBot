# Test Cases

## Chart Commands Test Cases

### `/steam chart`

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| SC-01 | Display chart for self | `/steam chart` (registered user) | Top 10 games bar chart displayed |
| SC-02 | Display chart for other user | `/steam chart user:@user` | Target user's chart displayed |
| SC-03 | Unregistered user (self) | `/steam chart` (unregistered) | Error: "You haven't linked your Steam account" |
| SC-04 | Unregistered target user | `/steam chart user:@unregistered` | Error: "has not linked their Steam account" |
| SC-05 | Private profile | `/steam chart` (private profile) | Warning: "has a private profile" |
| SC-06 | No games | `/steam chart` (user with no games) | Warning: "has no games" |
| SC-07 | Chart image format | `/steam chart` | PNG image attachment with dark theme |

### `/steam history-graph`

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| HG-01 | Default period (30d) | `/steam history-graph` | 30-day history graph displayed |
| HG-02 | 7 days period | `/steam history-graph period:7d` | 7-day history graph displayed |
| HG-03 | 90 days period | `/steam history-graph period:90d` | 90-day history graph displayed |
| HG-04 | 1 year period | `/steam history-graph period:1y` | 1-year history graph displayed |
| HG-05 | No history data | `/steam history-graph` (new user) | Warning with current playtime only |
| HG-06 | Insufficient data points | `/steam history-graph` (<2 records) | Warning: "Not enough history data" |
| HG-07 | Unregistered user | `/steam history-graph` (unregistered) | Error: "You haven't linked your Steam account" |
| HG-08 | Playtime gain calculation | `/steam history-graph` | Shows playtime added in period |

### `/server stats`

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| SS-01 | Display server stats | `/server stats` | Member stats + Steam stats displayed |
| SS-02 | Member count accuracy | `/server stats` | Total = Online + Offline + Bots |
| SS-03 | Steam registered count | `/server stats` | Shows registered/total users |
| SS-04 | Top players list | `/server stats` | Top 5 Steam players shown |
| SS-05 | Pie chart display | `/server stats` | Member status pie chart image |
| SS-06 | DM usage | `/server stats` (in DM) | Error: "can only be used in a server" |
| SS-07 | No registered users | `/server stats` (no Steam users) | Shows 0 registered, 0 playtime |

### Admin Commands (`/admin`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| AD-01 | Non-owner access | `/admin stats` (non-owner) | Error: "Bot owner only" |
| AD-02 | View bot stats | `/admin stats` (owner) | Bot stats embed displayed |
| AD-03 | View DB stats | `/admin db` (owner) | Database statistics displayed |
| AD-04 | List guilds | `/admin guilds` (owner) | Server list displayed |
| AD-05 | Broadcast message | `/admin broadcast message:test` (owner) | Confirmation message sent |
| AD-06 | View health | `/admin health` (owner) | System health status displayed |
| AD-07 | List backups | `/admin backup-list` (owner) | Backup list displayed |
| AD-08 | Run backup | `/admin backup-run` (owner) | Backup created successfully |
| AD-09 | View metrics | `/admin metrics` (owner) | Bot metrics displayed |

### Settings Commands (`/settings`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| ST-01 | View settings | `/settings view` | Current settings displayed |
| ST-02 | Change language to Japanese | `/settings language lang:ja` | Language changed to Japanese |
| ST-03 | Change language to English | `/settings language lang:en` | Language changed to English |
| ST-04 | Set audit channel | `/settings audit channel:#logs` | Audit channel configured |
| ST-05 | View audit logs | `/settings logs` | Recent audit logs displayed |
| ST-06 | Non-admin access | `/settings view` (non-admin) | Error: "missing permissions" |

### Poll Commands (`/poll`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| PL-01 | Create basic poll | `/poll create question:Test option1:A option2:B` | Poll created with 2 options |
| PL-02 | Create poll with duration | `/poll create ... duration:5` | Poll ends after 5 minutes |
| PL-03 | Create anonymous poll | `/poll create ... anonymous:true` | Anonymous poll created |
| PL-04 | End active poll | `/poll end` | Poll ended, results displayed |
| PL-05 | End with no active poll | `/poll end` (no poll) | Error: "No active poll" |
| PL-06 | Max options (10) | `/poll create ... option1-10` | Poll with 10 options |

### Roulette Commands (`/roulette`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| RL-01 | Random member selection | `/roulette member` (in VC) | One member randomly selected |
| RL-02 | Team division | `/roulette team count:2` | Members split into 2 teams |
| RL-03 | Not in voice channel | `/roulette member` (not in VC) | Error: "must be in a voice channel" |
| RL-04 | Only bots in VC | `/roulette member` (only bots) | Error: "no eligible members" |

### Voice Recording (`/record`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| VR-01 | Record 30 seconds | `/record duration:30s` | WAV file sent to channel |
| VR-02 | Record 1 minute | `/record duration:1m` | WAV file sent to channel |
| VR-03 | Invalid duration | `/record duration:abc` | Error: "Invalid duration" |
| VR-04 | Exceed max duration | `/record duration:10m` | Error: "Exceeds maximum" |
| VR-05 | Not in voice channel | `/record duration:30s` (not in VC) | Error: "must be in voice channel" |
| VR-06 | Large file splitting | `/record duration:5m` (>25MB) | Multiple files sent |

### Notification Commands (`/notify`)

| ID | Description | Input | Expected Result |
|----|-------------|-------|-----------------|
| NT-01 | Setup notifications | `/notify setup channel:#games` | Notification channel set |
| NT-02 | Check status | `/notify status` | Current settings displayed |
| NT-03 | Enable notifications | `/notify enable` | Notifications enabled |
| NT-04 | Disable notifications | `/notify disable` | Notifications disabled |
| NT-05 | Toggle personal | `/notify me action:enable` | Personal notifications toggled |

---

## Middleware Tests

### Cooldown Middleware

| ID | Description | Expected Result |
|----|-------------|-----------------|
| MW-01 | First command execution | Pass (cooldown set) |
| MW-02 | Immediate re-execution | Blocked with remaining time |
| MW-03 | After cooldown expires | Pass |
| MW-04 | Zero cooldown command | Always pass |
| MW-05 | Different users same command | Independent cooldowns |

### Permissions Middleware

| ID | Description | Expected Result |
|----|-------------|-----------------|
| MW-06 | No permissions required | Pass |
| MW-07 | Has required permission | Pass |
| MW-08 | Missing permission | Blocked with permission list |
| MW-09 | DM context with permissions | Blocked: "server only" |
| MW-10 | Multiple permissions check | All must be satisfied |

---

## Unit Tests

### `src/utils/chart.ts`

| ID | Function | Test Case | Expected Result |
|----|----------|-----------|-----------------|
| CH-01 | `createHorizontalBarChart` | Valid data | Returns Buffer (PNG) |
| CH-02 | `createHorizontalBarChart` | Empty arrays | Returns valid Buffer |
| CH-03 | `createHorizontalBarChart` | Long labels | Labels truncated to 25 chars |
| CH-04 | `createLineChart` | Valid data | Returns Buffer (PNG) |
| CH-05 | `createLineChart` | Single point | Returns valid Buffer |
| CH-06 | `createPieChart` | Valid data | Returns Buffer (PNG) |
| CH-07 | `createPieChart` | Zero values | Handles gracefully |

### `src/utils/constants.ts`

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| CO-01 | CHART_COLORS exists | Object with BACKGROUND, TEXT, GRID, PALETTE |
| CO-02 | CHART_COLORS.PALETTE length | At least 6 colors |
| CO-03 | TITLES.CHART exists | String value |
| CO-04 | TITLES.HISTORY_GRAPH exists | String value |
| CO-05 | TITLES.SERVER_STATS exists | String value |

---

## Integration Tests

### Chart Generation

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| INT-01 | Generate chart with Steam data | Valid PNG buffer |
| INT-02 | Chart dimensions | 600x400 pixels |
| INT-03 | Chart background color | #2f3136 (Discord dark) |

### Database Integration

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| INT-04 | `getPlaytimeHistory` returns data | Array of PlaytimeHistoryRecord |
| INT-05 | `getSteamUsersByDiscordIds` returns users | Array of SteamUserRecord |

---

## Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | Very long game names | Truncated in chart labels |
| EC-02 | 0 playtime for all games | Chart displays with 0 values |
| EC-03 | Unicode characters in names | Rendered correctly |
| EC-04 | Large number of data points | Chart remains readable |
| EC-05 | Concurrent chart requests | No memory issues |
| EC-06 | Invalid period option | Defaults to 30d |

---

## Manual Testing Checklist

### Before Release

- [ ] `/steam chart` displays correctly
- [ ] `/steam history-graph` with all period options
- [ ] `/server stats` in a server with Steam users
- [ ] `/server stats` in a server without Steam users
- [ ] Chart images render with dark theme
- [ ] No console errors during chart generation
- [ ] Memory usage stable after multiple requests

### Railway Deployment

- [ ] `canvas` builds successfully on nixpacks
- [ ] Charts generate without errors
- [ ] Response time < 3 seconds

