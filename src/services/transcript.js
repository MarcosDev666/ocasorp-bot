'use strict';
const fs = require('node:fs');
const path = require('node:path');

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function fetchAll(channel, limit = 500) {
  const collected = [];
  let before;
  while (collected.length < limit) {
    const batch = await channel.messages.fetch({ limit: Math.min(100, limit - collected.length), before }).catch(() => null);
    if (!batch || !batch.size) break;
    collected.push(...batch.values());
    before = batch.last?.().id ?? [...batch.values()].pop().id;
    if (batch.size < 100) break;
  }
  return collected.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function buildTranscript(channel, limit = 500) {
  const messages = await fetchAll(channel, limit);
  const rows = messages.map((m) => ({
    author: m.author?.tag || 'Desconocido',
    authorId: m.author?.id || '',
    avatar: m.author?.displayAvatarURL?.({ size: 64 }) || '',
    time: new Date(m.createdTimestamp).toISOString(),
    content: m.content || '',
    attachments: [...m.attachments.values()].map((a) => a.url),
    embeds: m.embeds.length,
  }));
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Transcript #${escapeHtml(channel.name)}</title>
<style>
body{background:#1e1f22;color:#dbdee1;font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:24px}
h1{color:#e8a33d;font-size:20px}.meta{color:#949ba4;font-size:13px;margin-bottom:24px}
.msg{display:flex;gap:12px;padding:10px 12px;border-radius:8px;margin-bottom:6px}
.msg:hover{background:#2b2d31}.avatar{width:40px;height:40px;border-radius:50%;background:#5865f2;flex:0 0 40px}
.author{color:#f2f3f5;font-weight:600}.time{color:#949ba4;font-size:12px;margin-left:8px}
.content{white-space:pre-wrap;line-height:1.45;margin-top:2px}
.att{display:block;color:#00a8fc;font-size:13px;margin-top:4px}
.embed{border-left:3px solid #e8a33d;padding-left:8px;color:#949ba4;font-size:13px;margin-top:4px}
</style></head><body>
<h1>Transcript de #${escapeHtml(channel.name)}</h1>
<div class="meta">${rows.length} mensajes • Generado el ${new Date().toLocaleString('es-AR')} • Ocaso Roleplay</div>
${rows.map((r) => `<div class="msg"><img class="avatar" src="${escapeHtml(r.avatar)}" alt=""><div><span class="author">${escapeHtml(r.author)}</span><span class="time">${escapeHtml(r.time)}</span><div class="content">${escapeHtml(r.content)}</div>${r.attachments.map((a) => `<a class="att" href="${escapeHtml(a)}">${escapeHtml(a)}</a>`).join('')}${r.embeds ? `<div class="embed">${r.embeds} embed(s)</div>` : ''}</div></div>`).join('\n')}
</body></html>`;
  const text = rows.map((r) => `[${r.time}] ${r.author}: ${r.content}${r.attachments.length ? ` (adjuntos: ${r.attachments.join(', ')})` : ''}`).join('\n');
  return { html, text, rows, count: rows.length };
}

async function saveTranscript(channel, dir = path.join(process.cwd(), 'transcripts')) {
  const data = await buildTranscript(channel);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${channel.guildId}-${channel.name}-${Date.now()}.html`);
  fs.writeFileSync(file, data.html, 'utf8');
  return { ...data, file, fileName: path.basename(file) };
}

module.exports = { buildTranscript, saveTranscript, fetchAll };
