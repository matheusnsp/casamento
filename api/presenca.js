'use strict';

/*
 * POST /api/presenca — confirma presença de um convidado da lista e, se for, dos acompanhantes
 * escolhidos (também da lista). A planilha confere tudo de novo antes de gravar.
 */

const presenca = require('./_lib/presenca');
const u = require('./_lib/util');

const ID_OK = /^[A-Za-z0-9_-]{2,40}$/;
const MAX_ACOMPANHANTES = 6;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return u.metodoNaoPermitido(res, 'POST');
  if (!presenca.configurado()) return u.erro(res, 503, 'indisponivel', 'A confirmação de presença está sendo ajustada. Tente de novo em alguns minutos.');
  if (!u.dentroDoLimite('presenca:' + u.ipDe(req), 15, 10 * 60 * 1000)) {
    return u.erro(res, 429, 'muitas_tentativas', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
  }

  let b;
  try { b = await u.lerCorpo(req); } catch (e) { return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.');
  if (b.hp) return u.erro(res, 400, 'recusado', 'Não foi possível enviar a confirmação.');

  const convidado = String(b.convidado || '');
  const vai = b.vai === 'sim' ? 'sim' : b.vai === 'nao' ? 'nao' : null;
  const pedidos = Array.isArray(b.acompanhantes) ? b.acompanhantes.map(String) : [];
  const email = u.limparTexto(b.email, 160).toLowerCase();

  if (!ID_OK.test(convidado)) return u.erro(res, 400, 'dados_invalidos', 'Escolha seu nome na lista de convidados.', { campo: 'nome' });
  if (!vai) return u.erro(res, 400, 'dados_invalidos', 'Diga se vai comparecer.', { campo: 'vai' });
  if (email && !u.emailValido(email)) return u.erro(res, 400, 'dados_invalidos', 'Confira o e-mail.', { campo: 'email' });
  const acompanhantes = vai === 'sim' ? [...new Set(pedidos)].filter((id) => id !== convidado) : [];
  if (acompanhantes.length > MAX_ACOMPANHANTES || acompanhantes.some((id) => !ID_OK.test(id))) {
    return u.erro(res, 400, 'dados_invalidos', `Escolha até ${MAX_ACOMPANHANTES} acompanhantes da lista.`, { campo: 'acompanhantes' });
  }

  let l;
  try {
    l = await presenca.lista();
  } catch (e) {
    console.error(JSON.stringify({ evt: 'presenca_erro', etapa: 'lista', motivo: e.codigo || e.message }));
    return u.erro(res, 502, 'instavel', 'Não conseguimos falar com a lista de convidados agora. Tente de novo em instantes.');
  }
  const porId = new Map(l.map((p) => [p.id, p]));
  const principal = porId.get(convidado);
  if (!principal) return u.erro(res, 400, 'nao_convidado', 'Não encontramos esse nome na lista. Busque e escolha seu nome de novo.', { campo: 'nome' });
  if (acompanhantes.some((id) => !porId.has(id))) {
    return u.erro(res, 400, 'nao_convidado', 'Algum acompanhante não está mais na lista. Remova e escolha de novo.', { campo: 'acompanhantes' });
  }

  let r;
  try {
    r = await presenca.confirmar({
      convidado,
      vai,
      acompanhantes,
      email,
      restricao: u.limparTexto(b.restricao, 200),
      mensagem: u.limparTexto(b.mensagem, 500),
    });
  } catch (e) {
    console.error(JSON.stringify({ evt: 'presenca_erro', etapa: 'gravar', motivo: e.codigo || e.message }));
    return u.erro(res, 502, 'instavel', 'Não conseguimos salvar sua confirmação. Tente de novo em instantes.');
  }
  if (!r.ok) {
    console.error(JSON.stringify({ evt: 'presenca_recusada', erro: r.erro, detalhe: r.detalhe }));
    if (r.erro === 'convidado_nao_encontrado' || r.erro === 'acompanhante_nao_encontrado') {
      return u.erro(res, 400, 'nao_convidado', 'A lista de convidados mudou. Busque os nomes de novo.', { campo: 'nome' });
    }
    return u.erro(res, 502, 'instavel', 'Não conseguimos salvar sua confirmação. Tente de novo em instantes.');
  }

  console.log(JSON.stringify({ evt: 'presenca', vai, acompanhantes: acompanhantes.length }));
  return u.enviar(res, 200, {
    ok: true,
    vai,
    nome: principal.nome,
    acompanhantes: acompanhantes.map((id) => porId.get(id).nome),
  });
};
