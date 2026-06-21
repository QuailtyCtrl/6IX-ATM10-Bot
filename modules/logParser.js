// modules/logParser.js
// Parses raw log4j lines from a NeoForge/Forge/vanilla server.log into
// structured events. Only processes lines handed to it -- incremental
// reading itself is sftp.js's job, this module is purely pattern matching.

// Standard line shape: [HH:MM:SS] [Thread/LEVEL]: message
const LINE_RE = /^\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]:\s?(.*)$/;

const PATTERNS = {
  // "Steve[/127.0.0.1:12345] logged in with entity id 123 at (...)"
  join: /^(\w{3,16})\[\/[\d.]+:\d+\] logged in with entity id \d+/,

  // "Steve lost connection: Disconnected"
  leave: /^(\w{3,16}) lost connection:/,

  // UUID resolution: "UUID of player Steve is 069a79f4-44e9-4726-a5be-fca90e38aaf5"
  uuid: /^UUID of player (\w{3,16}) is ([0-9a-fA-F-]{36})/,

  // Chat: "<Steve> hello everyone"
  chat: /^<(\w{3,16})> (.+)$/,

  // Advancement: "Steve has made the advancement [Allthemodium Smithing]"
  advancement: /^(\w{3,16}) has (?:made the advancement|reached the goal|completed the challenge) \[(.+)\]$/,

  // Death messages are extremely varied; we match generically on known verbs/patterns.
  death: /^(\w{3,16}) (was slain by|was shot by|was killed by|was blown up by|fell|drowned|burned to death|tried to swim in lava|hit the ground too hard|starved to death|suffocated|was squashed|froze to death|withered away|was pricked to death|died|was impaled|was struck by lightning).*$/,

  // Server restart / stop heuristics.
  stopping: /^Stopping server$/,
  startDone: /^Done \([\d.]+s\)! For help, type "help"/,
};

function parseLine(rawLine) {
  const match = rawLine.match(LINE_RE);
  const message = match ? match[3] : rawLine;
  const timestamp = match ? match[1] : null;

  let m;

  if ((m = message.match(PATTERNS.uuid))) {
    return { type: 'uuid', username: m[1], uuid: m[2], timestamp, raw: rawLine };
  }

  if ((m = message.match(PATTERNS.join))) {
    return { type: 'join', username: m[1], timestamp, raw: rawLine };
  }

  if ((m = message.match(PATTERNS.leave))) {
    return { type: 'leave', username: m[1], timestamp, raw: rawLine };
  }

  if ((m = message.match(PATTERNS.advancement))) {
    return { type: 'advancement', username: m[1], advancement: m[2], timestamp, raw: rawLine };
  }

  if ((m = message.match(PATTERNS.death))) {
    return { type: 'death', username: m[1], message, timestamp, raw: rawLine };
  }

  if ((m = message.match(PATTERNS.chat))) {
    return { type: 'chat', username: m[1], message: m[2], timestamp, raw: rawLine };
  }

  if (PATTERNS.stopping.test(message)) {
    return { type: 'stopping', timestamp, raw: rawLine };
  }

  if (PATTERNS.startDone.test(message)) {
    return { type: 'started', timestamp, raw: rawLine };
  }

  return null;
}

// Strictly processes only NEW lines -- caller (serverMonitor) is responsible
// for ensuring `lines` only contains content appended since the last read.
function parseLines(lines) {
  const events = [];
  for (const line of lines) {
    const event = parseLine(line);
    if (event) events.push(event);
  }
  return events;
}

module.exports = {
  parseLine,
  parseLines,
};
