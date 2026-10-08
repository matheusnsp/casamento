'use strict';

/*
 * Recado de um convidado para o mural (um por pessoa; mandar de novo substitui o anterior).
 *   GET  /api/recado?convidado=ID           → { ok, nome, mensagem, oculto }   o recado atual, para a pessoa editar
 *        (recado que o casal escondeu do mural: mensagem vazia e oculto: true — quem escolhe o nome não lê o texto)
 *   POST /api/recado { convidado, mensagem } → { ok, nome, nomeMural, mensagem }   texto vazio apaga
 * Só nomes da lista de convidados. O recado continua aberto depois do prazo de confirmação.
 */

const presenca = require('./_lib/presenca');
const u = require('./_lib/util');

const ID_OK = /^[A-Za-z0-9_-]{2,40}$/;
const JANELA = 10 * 60 * 1000;

async function convidado(id) {
  const l = await presenca.lista();
  return l.find((p) => p.id === id) || null;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return u.metodoNaoPermitido(res, 'GET, POST');
  if (!presenca.configurado()) return u.erro(res, 503, 'indisponivel', 'O mural de recados está sendo ajustado. Tente de novo em alguns minutos.');
  const ip = u.ipDe(req);

  if (req.method === 'GET') {
    if (!u.dentroDoLimite('recado-ler:' + ip, 60, JANELA)) {
      return u.erro(res, 429, 'muitas_tentativas', 'Muitas consultas seguidas. Espere alguns minutos e tente de novo.');
    }
    const id = String(u.lerQuery(req).convidado || '');
    if (!ID_OK.test(id)) return u.erro(res, 400, 'dados_invalidos', 'Escolha seu nome na lista de convidados.');
    try {
      const p = await convidado(id);
      if (!p) return u.erro(res, 404, 'nao_convidado', 'Não encontramos esse nome na lista. Busque e escolha seu nome de novo.');
      const r = await presenca.lerRecado(id);
      const oculto = r.oculto === true; // o script novo só marca quando há texto escondido
      return u.enviar(res, 200, { ok: true, nome: p.nome, mensagem: oculto ? '' : presenca.textoRecado(r.mensagem), oculto });
    } catch (e) {
      console.error(JSON.stringify({ evt: 'recado_erro', etapa: 'ler', motivo: e.codigo || e.message }));
      return u.erro(res, 502, 'instavel', 'Não conseguimos abrir o seu recado agora. Tente de novo em instantes.');
    }
  }

  if (!u.dentroDoLimite('recado-gravar:' + ip, 20, JANELA)) {
    return u.erro(res, 429, 'muitas_tentativas', 'Muitos envios seguidos. Espere alguns minutos e tente de novo.');
  }
  let b;
  try { b = await u.lerCorpo(req); } catch (e) { return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.');
  if (b.hp) return u.erro(res, 400, 'recusado', 'Não foi possível enviar o recado.');

  const id = String(b.convidado || '');
  if (!ID_OK.test(id)) return u.erro(res, 400, 'dados_invalidos', 'Escolha seu nome na lista de convidados.', { campo: 'nome' });
  if (b.mensagem != null && typeof b.mensagem !== 'string') return u.erro(res, 400, 'dados_invalidos', 'Escreva o seu recado.', { campo: 'mensagem' });
  const mensagem = presenca.textoRecado(b.mensagem);
  if (!mensagem && b.apagar !== true) return u.erro(res, 400, 'dados_invalidos', 'Escreva o seu recado.', { campo: 'mensagem' });

  let p;
  try {
    p = await convidado(id);
  } catch (e) {
    console.error(JSON.stringify({ evt: 'recado_erro', etapa: 'lista', motivo: e.codigo || e.message }));
    return u.erro(res, 502, 'instavel', 'Não conseguimos falar com a lista de convidados agora. Tente de novo em instantes.');
  }
  if (!p) return u.erro(res, 400, 'nao_convidado', 'Não encontramos esse nome na lista. Busque e escolha seu nome de novo.', { campo: 'nome' });

  let r;
  try {
    r = await presenca.salvarRecado(id, mensagem);
  } catch (e) {
    console.error(JSON.stringify({ evt: 'recado_erro', etapa: 'gravar', motivo: e.codigo || e.message }));
    if (e.codigo === 'convidado_nao_encontrado') {
      return u.erro(res, 400, 'nao_convidado', 'A lista de convidados mudou. Busque seu nome de novo.', { campo: 'nome' });
    }
    return u.erro(res, 502, 'instavel', 'Não conseguimos salvar o seu recado. Tente de novo em instantes.');
  }

  console.log(JSON.stringify({ evt: 'recado', tamanho: mensagem.length }));
  return u.enviar(res, 200, {
    ok: true,
    nome: p.nome,
    nomeMural: presenca.nomeCurto(p.nome),
    mensagem: presenca.textoRecado(r.mensagem),
    noMural: !!r.mensagem && !r.oculto,
  });
};
