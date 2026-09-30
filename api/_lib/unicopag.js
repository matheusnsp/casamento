'use strict';

/*
 * Cliente mínimo da API ÚnicoPag (docs.api.unicopag.com).
 * Autenticação por api_token na query; valores sempre em centavos.
 * O token vem só da variável de ambiente UNICOPAG_API_TOKEN e nunca vai para o navegador.
 */

const BASE = String(process.env.UNICOPAG_API_URL || 'https://api.cloud.unicopag.com.br').replace(/\/+$/, '');

class ErroUnicopag extends Error {
  constructor(mensagem, status, dados) {
    super(mensagem);
    this.name = 'ErroUnicopag';
    this.status = status || 0;
    this.dados = dados || null;
  }
}

function token() {
  return String(process.env.UNICOPAG_API_TOKEN || '').trim();
}

function configurado() {
  return token().length > 0;
}

async function chamar(metodo, caminho, opcoes) {
  const { query, corpo, timeoutMs } = opcoes || {};
  const t = token();
  if (!t) throw new ErroUnicopag('UNICOPAG_API_TOKEN não configurado', 0);

  const url = new URL(BASE + caminho);
  url.searchParams.set('api_token', t);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  let resposta;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: corpo
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(timeoutMs || 15000),
    });
  } catch (e) {
    const tempo = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new ErroUnicopag(tempo ? 'tempo_esgotado' : 'falha_de_rede', 0);
  }

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch (e) {
    dados = { bruto: texto.slice(0, 300) };
  }
  if (!resposta.ok) {
    throw new ErroUnicopag((dados && dados.message) || `HTTP ${resposta.status}`, resposta.status, dados);
  }
  return dados;
}

const criarPagamento = (payload) => chamar('POST', '/public/v1/payments', { corpo: payload, timeoutMs: 25000 });
const consultarTransacao = (hash) => chamar('GET', '/public/v1/transactions/' + encodeURIComponent(hash));
const consultarParcelas = (centavos) => chamar('GET', '/public/v1/installments', { query: { amount: centavos } });

/* Status da ÚnicoPag agrupados no que a página precisa mostrar. */
const GRUPOS = {
  paid: 'pago',
  waiting_payment: 'aguardando',
  pending: 'aguardando',
  processing: 'analise',
  antifraud: 'analise',
  med_received: 'analise',
  med_analysis: 'analise',
  refused: 'recusado',
  failed: 'recusado',
  med_reproved: 'recusado',
  cancelled: 'cancelado',
  refunded: 'estornado',
  chargeback: 'estornado',
  pre_chargeback: 'estornado',
};

function grupoDoStatus(status) {
  return GRUPOS[String(status || '').toLowerCase()] || 'aguardando';
}

/*
 * Aceita a transação solta (formato real: hash e payment_status no topo, e "transaction" é só o
 * id do adquirente, um texto) ou embrulhada num objeto "transaction"/"data" (ex.: resposta de estorno).
 */
function desembrulhar(bruto) {
  if (!bruto || typeof bruto !== 'object') return {};
  if (bruto.hash || bruto.payment_status) return bruto;
  for (const k of ['transaction', 'data']) {
    const v = bruto[k];
    if (Array.isArray(v) && v[0] && typeof v[0] === 'object') return v[0];
    if (v && typeof v === 'object') return v;
  }
  return bruto;
}

function normalizarTransacao(bruto) {
  const t = desembrulhar(bruto);
  const pix = t.pix || {};
  const numero = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  return {
    hash: t.hash || t.id || null,
    status: t.payment_status || t.status || null,
    metodo: t.payment_method || null,
    total: numero(t.amount_total) !== null ? t.amount_total : numero(t.amount),
    parcelas: t.installments || null,
    pix: {
      codigo: pix.pix_qr_code || pix.qr_code || pix.emv || t.pix_qr_code || null,
      imagem: pix.pix_base64 || pix.qr_code_base64 || null,
      url: pix.pix_url || null,
    },
    pagoEm: t.paid_at || null,
    cliente: t.customer || null,
    produtos: Array.isArray(t.products) ? t.products : Array.isArray(t.items) ? t.items : [],
    metadata: t.metadata && typeof t.metadata === 'object' ? t.metadata : null,
  };
}

module.exports = {
  ErroUnicopag, configurado, criarPagamento, consultarTransacao, consultarParcelas,
  grupoDoStatus, normalizarTransacao,
};