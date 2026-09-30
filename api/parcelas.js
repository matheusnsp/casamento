'use strict';

/* GET /api/parcelas?presente=ID[&valor=REAIS] — opções de parcelamento no cartão (juros definidos na conta ÚnicoPag). */

const unicopag = require('./_lib/unicopag');
const catalogo = require('./_lib/catalogo');
const { enviar, erro, metodoNaoPermitido, lerQuery, ipDe, dentroDoLimite } = require('./_lib/util');

const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;

function umaVez(valor) {
  return [{ parcelas: 1, valorParcela: valor, total: valor, juros: 0 }];
}

const primeiro = (...v) => v.find((x) => x !== undefined && x !== null && x !== '');

/*
 * A API responde { data: [{ installments, installment_amount, total_amount, installment_rate,
 * min_allowed_amount, max_allowed_amount }] }; o exemplo da documentação usa
 * { installments: [{ installment, amount, total, interest_rate }] }. Aceita os dois.
 */
function extrairLista(dados) {
  let lista = dados && typeof dados === 'object'
    ? (dados.data !== undefined ? dados.data : dados.installments !== undefined ? dados.installments : dados)
    : [];
  if (lista && !Array.isArray(lista) && typeof lista === 'object') {
    lista = Array.isArray(lista.installments) ? lista.installments : Object.values(lista);
  }
  return Array.isArray(lista) ? lista.filter((x) => x && typeof x === 'object') : [];
}

function normalizar(x, valor) {
  const min = Number(primeiro(x.min_allowed_amount, 0)) || 0;
  const max = Number(primeiro(x.max_allowed_amount, 0)) || 0;
  return {
    parcelas: parseInt(primeiro(x.installments, x.installment), 10),
    valorParcela: Number(primeiro(x.installment_amount, x.amount)),
    total: Number(primeiro(x.total_amount, x.total)),
    juros: Number(primeiro(x.installment_rate, x.interest_rate)) || 0,
    permitido: valor >= min && (!max || valor <= max),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return metodoNaoPermitido(res, 'GET');
  if (!unicopag.configurado()) return erro(res, 503, 'indisponivel', 'Os pagamentos ainda não foram ativados.');
  if (!dentroDoLimite('parcelas:' + ipDe(req), 300, 5 * 60 * 1000)) {
    return erro(res, 429, 'muitas_tentativas', 'Muitas consultas seguidas. Espere um minuto e tente de novo.');
  }

  const q = lerQuery(req);
  const presente = catalogo.buscar(q.presente);
  if (!presente) return erro(res, 400, 'presente_invalido', 'Presente não encontrado.');

  const regras = catalogo.regrasCartao();
  if (!regras.ativo || presente.somentePix) return erro(res, 400, 'cartao_indisponivel', 'Este presente aceita apenas PIX.');

  let valor = presente.valorCentavos;
  if (presente.livre) {
    const v = catalogo.valorLivreEmCentavos(q.valor);
    if (!v.ok) return erro(res, 400, 'valor_invalido', 'Valor fora dos limites.');
    valor = v.valor;
  }
  if (valor < regras.valorMinimo) return erro(res, 400, 'valor_minimo_cartao', 'Valor abaixo do mínimo para cartão.');

  const guardado = cache.get(valor);
  if (guardado && Date.now() - guardado.em < CACHE_MS) {
    return enviar(res, 200, { ok: true, valor, opcoes: guardado.opcoes }, 'private, max-age=300');
  }

  let opcoes = [];
  let parcial = false;
  try {
    const dados = await unicopag.consultarParcelas(valor);
    const lista = extrairLista(dados);
    opcoes = lista
      .map((x) => normalizar(x, valor))
      .filter((x) => x.permitido && Number.isInteger(x.parcelas) && x.parcelas >= 1 && x.parcelas <= regras.maxParcelas && x.valorParcela > 0 && x.total > 0)
      .map(({ permitido, ...resto }) => resto)
      .sort((a, b) => a.parcelas - b.parcelas);
    if (!opcoes.length) {
      console.warn(JSON.stringify({ evt: 'parcelas_formato', valor, itens: lista.length, chaves: Object.keys((lista[0]) || dados || {}).slice(0, 10) }));
    }
  } catch (e) {
    console.error(JSON.stringify({ evt: 'parcelas_erro', valor, http: e.status, msg: String(e.message || '').slice(0, 200) }));
    parcial = true;
  }
  if (!opcoes.length) {
    opcoes = umaVez(valor);
    parcial = true;
  }
  if (!parcial) cache.set(valor, { em: Date.now(), opcoes });

  enviar(res, 200, { ok: true, valor, opcoes, parcial }, parcial ? 'no-store' : 'private, max-age=300');
};