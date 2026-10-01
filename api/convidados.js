'use strict';

/* GET /api/convidados?q=NOME — até 8 convidados cujo nome bate com o que foi digitado (mínimo 2 letras). */

const presenca = require('./_lib/presenca');
const { enviar, erro, metodoNaoPermitido, lerQuery, ipDe, dentroDoLimite } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return metodoNaoPermitido(res, 'GET');
  if (!presenca.configurado()) return erro(res, 503, 'indisponivel', 'A confirmação de presença está sendo ajustada. Tente de novo em alguns minutos.');
  if (!dentroDoLimite('convidados:' + ipDe(req), 150, 10 * 60 * 1000)) {
    return erro(res, 429, 'muitas_tentativas', 'Muitas buscas seguidas. Espere alguns minutos e tente de novo.');
  }

  const q = String(lerQuery(req).q || '').slice(0, 60);
  if (presenca.normalizar(q).replace(/ /g, '').length < 2) return enviar(res, 200, { ok: true, resultados: [] });

  try {
    const achados = presenca.buscar(await presenca.lista(), q, 8);
    return enviar(res, 200, { ok: true, resultados: achados.map((p) => ({ id: p.id, nome: p.nome, crianca: p.crianca })) });
  } catch (e) {
    console.error(JSON.stringify({ evt: 'convidados_erro', motivo: e.codigo || e.message }));
    return erro(res, 502, 'instavel', 'Não conseguimos carregar a lista de convidados agora. Tente de novo em instantes.');
  }
};
