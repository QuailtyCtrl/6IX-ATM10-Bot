// modules/logParser.js
// Matches any line, assuming the server log prefix [Date] [Thread] [Logger].
// The logger bracket is optional since some lines (e.g. vanilla startup
// messages) may only carry [Date] [Thread] with no third bracket.
const LINE_RE = /^\[.*?\] \[.*?\](?: \[.*?\])?:\s?(.*)$/;

// Many lines carry an optional rank/prefix tag before the username, e.g.
// "[DEV] Steve was killed" or "<[DEV] Steve> hello". This matches and
// discards that tag without capturing it. Must include the brackets
// themselves, not just \w+, or it silently fails to match tagged lines.
const TAG_PREFIX = '(?:\\[\\w+\\]\\s+)?';

const PATTERNS = {
  join: new RegExp(`^${TAG_PREFIX}(\\w{3,16}) joined the game$`),
  leave: new RegExp(`^${TAG_PREFIX}(\\w{3,16}) left the game$`),
  uuid: /UUID of player (\w{3,16}) is ([0-9a-fA-F-]{36})/,
  chat: new RegExp(`^<${TAG_PREFIX}(\\w{3,16})> (.+)$`),
  advancement: new RegExp(
    `^${TAG_PREFIX}(\\w{3,16}) has (?:made|reached|completed) (?:the advancement|the goal|the challenge) \\[(.+)\\]$`
  ),
  // Includes plain "was killed" (no "by X") seen on servers with custom combat logging.
  death: new RegExp(
    `^${TAG_PREFIX}(\\w{3,16}) (was slain by|was shot by|was killed by|was killed|was blown up by|fell|drowned|burned to death|tried to swim in lava|hit the ground too hard|starved to death|suffocated)(.*)$`
  ),
  stopping: /^Stopping server$/,
  startDone: /Done \([\d.]+s\)!/,
};

function parseLine(rawLine) {
  const match = rawLine.match(LINE_RE);
  const message = match ? match[1] : rawLine;

  let m;
  if ((m = message.match(PATTERNS.uuid))) return { type: 'uuid', username: m[1], uuid: m[2], raw: rawLine };
  if ((m = message.match(PATTERNS.join))) return { type: 'join', username: m[1], raw: rawLine };
  if ((m = message.match(PATTERNS.leave))) return { type: 'leave', username: m[1], raw: rawLine };
  if ((m = message.match(PATTERNS.advancement))) return { type: 'advancement', username: m[1], advancement: m[2], raw: rawLine };
  if ((m = message.match(PATTERNS.death))) return { type: 'death', username: m[1], message, raw: rawLine };
  if ((m = message.match(PATTERNS.chat))) return { type: 'chat', username: m[1], message: m[2], raw: rawLine };
  if (PATTERNS.stopping.test(message)) return { type: 'stopping', raw: rawLine };
  if (PATTERNS.startDone.test(message)) return { type: 'started', raw: rawLine };

  return null;
}

function parseLines(lines) {
  return lines.map(parseLine).filter(Boolean);
}

// Generates the same deterministic UUID Minecraft itself uses for players on
// offline-mode (cracked/no-auth) servers: a version-3 (name-based, MD5) UUID
// derived from "OfflinePlayer:<username>". Used as a fallback when the
// server log never emits the official "UUID of player X is Y" line.
const crypto = require('crypto');
function generateOfflineUuid(username) {
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

module.exports = { parseLine, parseLines, generateOfflineUuid };