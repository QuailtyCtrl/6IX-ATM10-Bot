// modules/playtime.js
// Formatting + calculation helpers for playtime / durations.

function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

// Total playtime stored + any currently-active session.
function getLiveTotalPlaytime(player) {
  let total = player.total_playtime || 0;
  if (player.session_start) {
    total += Date.now() - player.session_start;
  }
  return total;
}

module.exports = {
  formatDuration,
  getLiveTotalPlaytime,
};
