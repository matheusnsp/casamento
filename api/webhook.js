'use strict';

/*
 * POST /api/webhook — avisos da ÚnicoPag: o postback de cada cobrança e o webhook da conta
 * (Integrações → Webhooks). O aviso não tem assinatura, então o status sempre é conferido direto
 * na API antes de valer. Um mesmo pagamento pode avisar mais de uma vez: a notificação opcional
 * (NOTIFICACAO_URL: Make, Apps Script etc.) só sai uma vez por pagamento em cada instância.
 */

const unicopag = require('./_lib/unicopag');
const { enviar, erro, metodoNaoPermitido, lerCorpo, ipDe, dentroDoLimite } = require('./_lib/util');

const HASH_OK = /^[A-Za-z0-9_-]{4,80}$/;
const jaNotificados = new Map();
const DOZE_HORAS = 12 * 3600 * 1000;

/* O hash pode vir solto (postback) ou dentro de "transaction"/"data" (eventos da conta). */
function candidatos(corpo) {
  const blocos = [corpo, corpo.transaction, corpo.data, corpo.data && corpo.data.transaction, corpo.payload];
  const lista = [];
  for (const campo of ['hash', 'transaction_hash', 'id']) {
    for (const b of blocos) {
      if (b && typeof b === 'object' && typeof b[campo] === 'string' && HASH_OK.test(b[campo]) && !lista.includes(b[campo])) lista.push(b[campo]);
    }
  }
  return lista.slice(0, 3);
}

function metadataDoAviso(corpo) {
  for (const b of [corpo, corpo.transaction, corpo.data, corpo.data && corpo.data.transaction]) {
    if (b && b.metadata && typeof b.metadata === 'object') return b.metadata;
  }
  return {};
}

async function notificar(t, corpo) {
  const destino = String(process.env.NOTIFICACAO_URL || '').trim();
  if (!/^https:\/\//.test(destino)) return;
  const agora = Date.now();
  for (const [h, em] of jaNotificados) if (agora - em > DOZE_HORAS) jaNotificados.delete(h);
  if (jaNotificados.has(t.hash)) return;
  jaNotificados.set(t.hash, agora);

  const meta = t.metadata || metadataDoAviso(corpo);
  const produto = t.produtos[0] || {};
  const cliente = t.cliente || {};
  const aviso = {
    evento: 'presente.pago',
    id: t.hash,
    presente: meta.presente_nome || produto.title || '',
    presente_id: meta.presente_id || produto.hash || '',
    valor: typeof t.total === 'number' ? t.total / 100 : null,
    forma: t.metodo === 'credit_card' ? 'cartao' : t.metodo || '',
    parcelas: t.parcelas || 1,
    convidado: { nome: cliente.name || '', email: cliente.email || '', telefone: cliente.phone_number || '' },
    mensagem: typeof meta.mensagem === 'string' ? meta.mensagem : '',
    pago_em: t.pagoEm,
  };
  try {
    await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aviso),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    jaNotificados.delete(t.hash);
    console.error(JSON.stringify({ evt: 'notificacao_erro', hash: t.hash, msg: String(e.message || '').slice(0, 120) }));
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return metodoNaoPermitido(res, 'POST');
  if (!dentroDoLimite('webhook:' + ipDe(req), 120, 60 * 1000)) return erro(res, 429, 'muitas_tentativas', 'Tente de novo em instantes.');

  let corpo = {};
  try {
    corpo = (await lerCorpo(req)) || {};
  } catch (e) {
    return enviar(res, 200, { ok: true, ignorado: 'corpo_invalido' });
  }
  if (!corpo || typeof corpo !== 'object') return enviar(res, 200, { ok: true, ignorado: 'corpo_invalido' });

  const lista = candidatos(corpo);
  if (!lista.length) return enviar(res, 200, { ok: true, ignorado: 'sem_hash' });
  if (!unicopag.configurado()) return erro(res, 503, 'indisponivel', 'Token não configurado.');

  let t = null;
  for (const hash of lista) {
    try {
      t = unicopag.normalizarTransacao(await unicopag.consultarTransacao(hash));
      if (t.hash) break;
      t = null;
    } catch (e) {
      if (e.status === 404) continue;
      console.error(JSON.stringify({ evt: 'webhook_erro', hash, http: e.status, msg: String(e.message || '').slice(0, 200) }));
      return erro(res, 502, 'instavel', 'Falha ao conferir a transação.'); // a ÚnicoPag reenvia
    }
  }
  if (!t) return enviar(res, 200, { ok: true, ignorado: 'nao_encontrado' });

  const produto = t.produtos[0] || {};
  console.log(JSON.stringify({
    evt: 'webhook', evento: corpo.event || corpo.type || null, hash: t.hash, status: t.status,
    presente: (t.metadata && t.metadata.presente_id) || produto.hash || null, valor: t.total,
  }));

  if (t.status === 'paid') await notificar(t, corpo);
  return enviar(res, 200, { ok: true });
};
