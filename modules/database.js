// modules/database.js
// Handles SQLite initialization and all player data access.
// Auto-creates the database file and `players` table if they don't exist.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('./config');

const dbDir = path.dirname(config.paths.database);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(config.paths.database, (err) => {
  if (err) {
    console.error('[database] Failed to open database:', err.message);
  } else {
    console.log('[database] Connected to SQLite database.');
  }
});

function init() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS players (
        uuid TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        first_join INTEGER,
        last_seen INTEGER,
        total_playtime INTEGER DEFAULT 0,
        sessions INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        advancements INTEGER DEFAULT 0,
        session_start INTEGER DEFAULT NULL
      )`,
      (err) => {
        if (err) return reject(err);
        console.log('[database] players table ready.');
        resolve();
      }
    );
  });
}

// --- Player helpers ---

function getPlayer(uuid) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM players WHERE uuid = ?', [uuid], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function getPlayerByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM players WHERE username = ? COLLATE NOCASE',
      [username],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function upsertPlayer(uuid, username) {
  const now = Date.now();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO players (uuid, username, first_join, last_seen)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         username = excluded.username,
         last_seen = excluded.last_seen`,
      [uuid, username, now, now],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function startSession(uuid) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE players SET session_start = ?, sessions = sessions + 1 WHERE uuid = ?`,
      [Date.now(), uuid],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function endSession(uuid) {
  return new Promise((resolve, reject) => {
    db.get('SELECT session_start FROM players WHERE uuid = ?', [uuid], (err, row) => {
      if (err) return reject(err);
      if (!row || !row.session_start) return resolve(0);

      const duration = Date.now() - row.session_start;
      db.run(
        `UPDATE players SET total_playtime = total_playtime + ?, last_seen = ?, session_start = NULL WHERE uuid = ?`,
        [duration, Date.now(), uuid],
        (err2) => {
          if (err2) return reject(err2);
          resolve(duration);
        }
      );
    });
  });
}

function incrementDeaths(uuid) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE players SET deaths = deaths + 1 WHERE uuid = ?', [uuid], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function incrementAdvancements(uuid) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE players SET advancements = advancements + 1 WHERE uuid = ?', [uuid], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getAllPlayers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM players', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  init,
  getPlayer,
  getPlayerByUsername,
  upsertPlayer,
  startSession,
  endSession,
  incrementDeaths,
  incrementAdvancements,
  getAllPlayers,
};
