'use strict';

/* Utilitários compartilhados pelas funções /api (não viram endpoint: a pasta começa com "_"). */

function enviar(res, status, corpo, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(corpo));
}

function erro(res, status, codigo, mensagem, extra) {
  enviar(res, status, Object.assign({ ok: false, erro: codigo, mensagem: mensagem }, extra || {}));
}

function metodoNaoPermitido(res, permitido) {
  res.setHeader('Allow', permitido);
  erro(res, 405, 'metodo', 'Método não permitido.');
}

function lerQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const u = new URL(req.url || '/', 'http://local');
  return Object.fromEntries(u.searchParams.entries());
}

/* Lê o corpo JSON. Na Vercel o req.body já vem pronto; fora dela, lê o stream. */
async function lerCorpo(req) {
  let corpo;
  try {
    corpo = req.body;
  } catch (e) {
    throw new Error('json_invalido');
  }
  if (corpo !== undefined && corpo !== null) {
    if (Buffer.isBuffer(corpo)) corpo = corpo.toString('utf8');
    if (typeof corpo === 'string') return corpo.trim() ? JSON.parse(corpo) : {};
    return corpo;
  }
  const partes = [];
  let total = 0;
  for await (const parte of req) {
    total += parte.length;
    if (total > 64 * 1024) throw new Error('corpo_grande');
    partes.push(parte);
  }
  const texto = Buffer.concat(partes).toString('utf8');
  return texto.trim() ? JSON.parse(texto) : {};
}

function ipDe(req) {
  const h = req.headers || {};
  const bruto = h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'desconhecido';
  return String(bruto).trim();
}

/* Limite simples por instância da função (melhor esforço contra abuso e teste de cartões). */
const baldes = new Map();
function dentroDoLimite(chave, maximo, janelaMs) {
  const agora = Date.now();
  let b = baldes.get(chave);
  if (!b || agora - b.inicio > janelaMs) {
    b = { inicio: agora, n: 0 };
    baldes.set(chave, b);
  }
  b.n += 1;
  if (baldes.size > 5000) {
    for (const [k, v] of baldes) if (agora - v.inicio > janelaMs) baldes.delete(k);
  }
  return b.n <= maximo;
}

const soDigitos = (v) => String(v == null ? '' : v).replace(/\D+/g, '');

function cpfValido(valor) {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

function luhnValido(numero) {
  let soma = 0;
  let dobra = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let x = Number(numero[i]);
    if (dobra) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    soma += x;
    dobra = !dobra;
  }
  return soma % 10 === 0;
}

function limparTexto(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function nomeValido(nome) {
  return nome.length >= 5 && nome.length <= 120 && /\S+\s+\S+/.test(nome) && /^[\p{L}][\p{L}'’.\- ]*$/u.test(nome);
}

function emailValido(email) {
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function telefoneValido(d) {
  return (d.length === 10 || d.length === 11) && d[0] !== '0';
}

/* "YYYY-MM-DD HH:mm:ss" no horário de Brasília, formato pedido pela ÚnicoPag no metadata. */
function dataHoraSP(data) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(data || new Date());
  const p = {};
  for (const x of partes) p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/* Endereço público do site, usado no postback_url. */
function urlDoSite() {
  const e = process.env;
  const definida = String(e.SITE_URL || '').trim().replace(/\/+$/, '');
  if (definida) return definida;
  if (e.VERCEL_ENV === 'production' && e.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + e.VERCEL_PROJECT_PRODUCTION_URL;
  if (e.VERCEL_URL) return 'https://' + e.VERCEL_URL;
  return '';
}

module.exports = {
  enviar, erro, metodoNaoPermitido, lerQuery, lerCorpo, ipDe, dentroDoLimite,
  soDigitos, cpfValido, luhnValido, limparTexto, nomeValido, emailValido, telefoneValido,
  dataHoraSP, urlDoSite,
};
