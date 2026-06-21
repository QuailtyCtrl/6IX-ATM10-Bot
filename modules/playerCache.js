// modules/playerCache.js
// In-memory cache of currently online players (uuid <-> username).
// Avoids hammering the database for lookups during log parsing.

const online = new Map(); // uuid -> { username, joinedAt }

function addPlayer(uuid, username) {
  online.set(uuid, { username, joinedAt: Date.now() });
}

function removePlayer(uuid) {
  const data = online.get(uuid);
  online.delete(uuid);
  return data || null;
}

function getPlayer(uuid) {
  return online.get(uuid) || null;
}

function findByUsername(username) {
  for (const [uuid, data] of online.entries()) {
    if (data.username.toLowerCase() === username.toLowerCase()) {
      return { uuid, ...data };
    }
  }
  return null;
}

function isOnline(uuid) {
  return online.has(uuid);
}

function getOnlineList() {
  return Array.from(online.entries()).map(([uuid, data]) => ({
    uuid,
    username: data.username,
    joinedAt: data.joinedAt,
  }));
}

function getOnlineCount() {
  return online.size;
}

function clear() {
  online.clear();
}

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  findByUsername,
  isOnline,
  getOnlineList,
  getOnlineCount,
  clear,
};
