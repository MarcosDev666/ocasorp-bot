'use strict';
const COLORS = { reset: '\x1b[0m', gray: '\x1b[90m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m' };
const stamp = () => new Date().toISOString().slice(11, 19);
const line = (color, tag, msg) => console.log(`${COLORS.gray}[${stamp()}]${COLORS.reset} ${color}${tag}${COLORS.reset} ${msg}`);
module.exports = {
  info: (m) => line(COLORS.cyan, 'INFO ', m),
  success: (m) => line(COLORS.green, 'OK   ', m),
  warn: (m) => line(COLORS.yellow, 'WARN ', m),
  error: (m) => line(COLORS.red, 'ERROR', m),
  debug: (m) => (process.env.DEBUG ? line(COLORS.magenta, 'DEBUG', m) : undefined),
  samp: (m) => line(COLORS.blue, 'SAMP ', m),
};
