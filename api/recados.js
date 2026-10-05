'use strict';

/*
 * GET /api/recados — recados do mural do site: só as mensagens que o convidado deixou mostrar
 * e que estão com "Sim" na coluna Mural da planilha. Vai o nome curto (primeiro e último nome) e o texto,
 * nada de e-mail, presença ou restrição. A resposta fica alguns minutos no cache da Vercel.
 */

const presenca = require('./_lib/presenca');
const { enviar, erro, metodoNaoPermitido, ipDe, dentroDoLimite } = require('./_lib/util');

const MAX_RECADOS = 60;
const CACHE_OK = 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';
const SUFIXOS = /^(filho|filha|junior|júnior|jr\.?|neto|neta|sobrinho|sobrinha)$/i;

/* "Sônia Regina Neves dos Santos" → "Sônia Santos"; "João da Silva Filho" → "João Silva Filho". */
function nomeCurto(nome) {
  const p = String(nome).trim().split(/\s+/).filter(Boolean);
  if (p.length <= 2) return p.join(' ');
  const ultimo = p[p.length - 1];
  if (SUFIXOS.test(ultimo)) return [p[0], p[p.length - 2], ultimo].join(' ');
  return p[0] + ' ' + ultimo;
}

function texto(s) {
  return String(s).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 500);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return metodoNaoPermitido(res, 'GET');
  if (!presenca.configurado()) return enviar(res, 200, { ok: true, recados: [] }, 'public, max-age=60');
  if (!dentroDoLimite('recados:' + ipDe(req), 60, 10 * 60 * 1000)) {
    return erro(res, 429, 'muitas_tentativas', 'Muitas consultas seguidas. Espere alguns minutos e tente de novo.');
  }

  try {
    const recados = (await presenca.recados())
      .slice()
      .sort((a, b) => b.em - a.em)
      .slice(0, MAX_RECADOS)
      .map((r) => ({ nome: nomeCurto(r.nome), mensagem: texto(r.mensagem) }))
      .filter((r) => r.nome && r.mensagem);
    return enviar(res, 200, { ok: true, recados }, CACHE_OK);
  } catch (e) {
    console.error(JSON.stringify({ evt: 'recados_erro', motivo: e.codigo || e.message }));
    return erro(res, 502, 'instavel', 'Não conseguimos carregar os recados agora.');
  }
};
