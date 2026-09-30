'use strict';

/* GET /api/status?id=HASH — a página consulta aqui até o PIX ser pago. Só devolve o status. */

const unicopag = require('./_lib/unicopag');
const { enviar, erro, metodoNaoPermitido, lerQuery, ipDe, dentroDoLimite } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return metodoNaoPermitido(res, 'GET');
  if (!unicopag.configurado()) return erro(res, 503, 'indisponivel', 'Os pagamentos ainda não foram ativados.');

  const id = String(lerQuery(req).id || '');
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return erro(res, 400, 'id_invalido', 'Pagamento não encontrado.');
  if (!dentroDoLimite('status:' + ipDe(req), 1500, 5 * 60 * 1000)) {
    return erro(res, 429, 'muitas_tentativas', 'Muitas consultas seguidas.');
  }

  try {
    const t = unicopag.normalizarTransacao(await unicopag.consultarTransacao(id));
    return enviar(res, 200, { ok: true, status: t.status, grupo: unicopag.grupoDoStatus(t.status) });
  } catch (e) {
    if (e.status === 404) return erro(res, 404, 'nao_encontrado', 'Pagamento não encontrado.');
    console.error(JSON.stringify({ evt: 'status_erro', id, http: e.status, msg: String(e.message || '').slice(0, 200) }));
    return erro(res, 502, 'instavel', 'Não foi possível consultar agora.');
  }
};
