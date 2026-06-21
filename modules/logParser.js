// modules/logParser.js
// Matches any line, assuming the server log prefix [Date] [Thread] [Logger]
const LINE_RE = /^\[.*?\] \[.*?\] \[.*?\]:\s?(.*)$/;

const PATTERNS = {
  join: /(?:\[\w+\]\s+)?(\w{3,16}) joined the game$/,
  leave: /(?:\[\w+\]\s+)?(\w{3,16}) left the game$/,
  uuid: /UUID of player (\w{3,16}) is ([0-9a-fA-F-]{36})/,
  chat: /^<(?:\w+\]\s+)?(\w{3,16})> (.+)$/,
  advancement: /(?:\[\w+\]\s+)?(\w{3,16}) has (?:made|reached|completed) (?:the advancement|the goal|the challenge) \[(.+)\]$/,
  death: /(?:\[\w+\]\s+)?(\w{3,16}) (was slain by|was shot by|fell|drowned|died).*/,
  startDone: /Done \([\d.]+s\)!/,
};

function parseLine(rawLine) {
  const match = rawLine.match(LINE_RE);
  const message = match ? match[1] : rawLine;
  
  let m;
  if ((m = message.match(PATTERNS.uuid))) return { type: 'uuid', username: m[1], uuid: m[2], raw: rawLine };
  if ((m = message.match(PATTERNS.join))) return { type: 'join', username: m[1], raw: rawLine };
  if ((m = message.match(PATTERNS.leave))) return { type: 'leave', username: m[1], raw: rawLine };
  if ((m = message.match(PATTERNS.chat))) return { type: 'chat', username: m[1], message: m[2], raw: rawLine };
  if (PATTERNS.startDone.test(message)) return { type: 'started', raw: rawLine };

  return null;
}

function parseLines(lines) {
  return lines.map(parseLine).filter(Boolean);
}

module.exports = { parseLines };