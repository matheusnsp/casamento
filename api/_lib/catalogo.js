'use strict';

/*
 * O catálogo é o mesmo presentes.js que a página lê.
 * O servidor sempre cobra o valor daqui: o valor enviado pelo navegador só vale para "valor livre".
 */

const dados = require('../../presentes.js');

const ID_VALOR_LIVRE = 'valor-livre';
const centavos = (reais) => Math.round(Number(reais) * 100);

const porId = new Map();
for (const p of Array.isArray(dados.presentes) ? dados.presentes : []) {
  if (!p || typeof p.id !== 'string' || !/^[a-z0-9-]{2,60}$/.test(p.id)) continue;
  if (p.id === ID_VALOR_LIVRE || porId.has(p.id)) continue;
  const valor = centavos(p.valor);
  if (!Number.isInteger(valor) || valor < 1) continue;
  porId.set(p.id, {
    id: p.id,
    nome: String(p.nome || p.id).slice(0, 120),
    valorCentavos: valor,
    somentePix: p.somentePix === true,
    livre: false,
  });
}

function regrasValorLivre() {
  const v = dados.valorLivre || {};
  return {
    ativo: v.ativo !== false,
    minimo: centavos(v.minimo != null ? v.minimo : 20),
    maximo: centavos(v.maximo != null ? v.maximo : 10000),
  };
}

function regrasCartao() {
  const c = dados.cartao || {};
  const max = parseInt(c.maxParcelas, 10);
  return {
    ativo: c.ativo !== false,
    valorMinimo: centavos(c.valorMinimo != null ? c.valorMinimo : 20),
    maxParcelas: Number.isInteger(max) && max >= 1 && max <= 12 ? max : 12,
  };
}

/* Presente pelo id (itens ocultos também valem: é assim que o teste com ?teste=1 funciona). */
function buscar(id) {
  if (id === ID_VALOR_LIVRE) {
    return regrasValorLivre().ativo
      ? { id: ID_VALOR_LIVRE, nome: 'Valor livre', valorCentavos: null, somentePix: false, livre: true }
      : null;
  }
  return porId.get(String(id || '')) || null;
}

/* Converte o valor livre digitado (em reais) para centavos, dentro dos limites. */
function valorLivreEmCentavos(entrada) {
  const regras = regrasValorLivre();
  const texto = String(entrada == null ? '' : entrada).trim().replace(/\s/g, '');
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(texto)) return { ok: false, regras };
  const valor = centavos(texto.replace(',', '.'));
  if (valor < regras.minimo || valor > regras.maximo) return { ok: false, regras };
  return { ok: true, valor, regras };
}

module.exports = { ID_VALOR_LIVRE, buscar, regrasValorLivre, regrasCartao, valorLivreEmCentavos };
