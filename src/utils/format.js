'use strict';

const pad = (n) => String(n).padStart(2, '0');

function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec || !parts.length) parts.push(`${sec}s`);
  return parts.slice(0, 3).join(' ');
}

function parseDuration(input) {
  if (!input) return null;
  if (typeof input === 'number') return input;
  const regex = /(\d+)\s*(d|día|dias|días|h|hora|horas|m|min|minutos|s|seg|segundos|w|sem|semanas?)/gi;
  let total = 0;
  let match;
  let found = false;
  while ((match = regex.exec(input)) !== null) {
    found = true;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('w') || unit.startsWith('sem')) total += value * 604800000;
    else if (unit.startsWith('d')) total += value * 86400000;
    else if (unit.startsWith('h')) total += value * 3600000;
    else if (unit.startsWith('m')) total += value * 60000;
    else total += value * 1000;
  }
  if (!found) {
    const n = Number(input);
    return Number.isFinite(n) ? n * 1000 : null;
  }
  return total;
}

function hours(v) {
  return `${Number(v || 0).toFixed(1)} h`;
}

const number = (n) => Number(n || 0).toLocaleString('es-AR');
const money = (n) => `$${number(Math.round(Number(n) || 0))}`;
const percent = (n) => `${Math.round(Number(n) || 0)}%`;
const truncate = (str, len = 100) => (String(str).length > len ? `${String(str).slice(0, len - 1)}…` : String(str));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const capitalize = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const progressBar = (value, max, size = 12) => {
  const filled = Math.max(0, Math.min(size, Math.round((Number(value) / Math.max(1, Number(max))) * size)));
  return '▰'.repeat(filled) + '▱'.repeat(size - filled);
};
const timestamp = (date, style = 'R') => `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
const fullDate = (date) => {
  const d = new Date(date);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const ordinal = (n) => `${n}º`;

module.exports = {
  duration, parseDuration, hours, number, money, percent, truncate, chunk, sample, shuffle,
  randomInt, capitalize, progressBar, timestamp, fullDate, ordinal,
};
