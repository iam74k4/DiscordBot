const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startDailyCleanup(task: () => void): NodeJS.Timeout {
  task();
  return setInterval(task, ONE_DAY_MS);
}

export function stopCleanupInterval(
  interval: NodeJS.Timeout | null
): NodeJS.Timeout | null {
  if (interval) {
    clearInterval(interval);
  }

  return null;
}
