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

