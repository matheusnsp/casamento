'use strict';

/*
 * Lista de convidados, confirmações e recados, via Apps Script da planilha.
 * A lista inteira só circula entre a Vercel e o Google (protegida pela chave);
 * a página recebe apenas os nomes que batem com o que a pessoa digitou.
 */

const URL_PADRAO = 'https://script.google.com/macros/s/AKfycbwV6qSx2ZkaSkOMI0qB-uKXD7_g_Rygag3Dh-7OhOCU0agx7BO5p1Bhc6cjH8AeC3kHmA/exec';
const VALIDADE_CACHE = 5 * 60 * 1000;
const MAX_RECADO = 500; // caracteres por recado (o Apps Script corta no mesmo tamanho)

/*
 * Último momento para confirmar presença: 20/12/2026, 23h59 no horário de Brasília.
 * Para mudar, troque aqui, em PRAZO_CONFIRMACAO no index.html e nos textos "20 de dezembro" (veja o LEIA-ME).
 * PRESENCA_PRAZO existe só para testes, e só vale com data, hora e fuso (ex.: 2026-12-27T23:59:59-03:00).
 */
const PRAZO_PADRAO = '2026-12-20T23:59:59-03:00';
const PRAZO_FORMATO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
let prazoAvisado = '';
const prazo = () => {
  const v = String(process.env.PRESENCA_PRAZO || '').trim();
  const t = PRAZO_FORMATO.test(v) ? Date.parse(v) : NaN;
  if (Number.isFinite(t)) return t;
  if (v && v !== prazoAvisado) { // sem fuso, a Vercel leria no horário de Londres: melhor ignorar e avisar no log
    prazoAvisado = v;
    console.error(JSON.stringify({ evt: 'prazo_invalido', valor: v.slice(0, 40) }));
  }
  return Date.parse(PRAZO_PADRAO);
};
const confirmacoesAbertas = (agora = Date.now()) => agora <= prazo();
let cache = { em: 0, lista: null };
let cacheRecados = { em: 0, lista: null };

const url = () => String(process.env.PRESENCA_URL || URL_PADRAO).trim();
const chave = () => String(process.env.PRESENCA_CHAVE || '').trim();
const configurado = () => chave().length > 0;

class ErroPlanilha extends Error {
  constructor(codigo) {
    super(codigo);
    this.codigo = codigo;
  }
}

function normalizar(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function chamar(opcoes) {
  let r;
  try {
    r = await fetch(opcoes.url, {
      method: opcoes.metodo || 'GET',
      headers: opcoes.corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(opcoes.timeoutMs || 20000),
    });
  } catch (e) {
    throw new ErroPlanilha(e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'tempo_esgotado' : 'falha_de_rede');
  }
  const texto = await r.text();
  let dados = null;
  try { dados = JSON.parse(texto); } catch (e) { /* página de erro do Google */ }
  if (!r.ok || !dados) throw new ErroPlanilha('resposta_invalida');
  return dados;
}

/* Lista completa (só no servidor), com cache de 5 min. Se o Google falhar, usa a última lista boa. */
async function lista() {
  if (cache.lista && Date.now() - cache.em < VALIDADE_CACHE) return cache.lista;
  try {
    const u = new URL(url());
    u.searchParams.set('acao', 'lista');
    u.searchParams.set('chave', chave());
    const d = await chamar({ url: u });
    if (!d.ok || !Array.isArray(d.convidados)) throw new ErroPlanilha(d.erro || 'resposta_invalida');
    const l = d.convidados
      .filter((x) => x && x.id && x.nome)
      .map((x) => ({ id: String(x.id), nome: String(x.nome).trim(), crianca: !!x.crianca, termos: normalizar(x.nome).split(' ') }));
    cache = { em: Date.now(), lista: l };
    return l;
  } catch (e) {
    if (cache.lista) return cache.lista;
    throw e;
  }
}

/* Cada palavra digitada precisa ser começo de alguma palavra do nome ("mat nev" acha "Matheus Neves"). */
function buscar(l, consulta, maximo) {
  const palavras = normalizar(consulta).split(' ').filter(Boolean);
  if (!palavras.length) return [];
  const achados = [];
  for (const p of l) {
    let nota = 0;
    let todas = true;
    for (const w of palavras) {
      const i = p.termos.findIndex((t) => t.startsWith(w));
      if (i < 0) { todas = false; break; }
      nota += i === 0 ? 2 : 1;
    }
    if (todas) achados.push({ p, nota });
  }
  achados.sort((a, b) => b.nota - a.nota || a.p.nome.localeCompare(b.p.nome, 'pt-BR'));
  return achados.slice(0, maximo).map((x) => x.p);
}

/* Recados do mural (só os marcados "Sim" na coluna Mural da planilha), com cache de 5 min. */
async function recados() {
  if (cacheRecados.lista && Date.now() - cacheRecados.em < VALIDADE_CACHE) return cacheRecados.lista;
  try {
    const u = new URL(url());
    u.searchParams.set('acao', 'recados');
    u.searchParams.set('chave', chave());
    const d = await chamar({ url: u });
    if (!d.ok || !Array.isArray(d.recados)) throw new ErroPlanilha(d.erro || 'resposta_invalida');
    const l = d.recados
      .filter((x) => x && x.nome && x.mensagem)
      .map((x) => ({ nome: String(x.nome).trim(), mensagem: String(x.mensagem).trim(), em: Date.parse(x.em) || 0 }));
    cacheRecados = { em: Date.now(), lista: l };
    return l;
  } catch (e) {
    if (cacheRecados.lista) return cacheRecados.lista;
    throw e;
  }
}

/* "Sônia Regina Neves dos Santos" → "Sônia Santos"; "João da Silva Filho" → "João Silva Filho". É o nome que aparece no mural. */
const SUFIXOS = /^(filho|filha|junior|júnior|jr\.?|neto|neta|sobrinho|sobrinha)$/i;
function nomeCurto(nome) {
  const p = String(nome).trim().split(/\s+/).filter(Boolean);
  if (p.length <= 2) return p.join(' ');
  const ultimo = p[p.length - 1];
  if (SUFIXOS.test(ultimo)) return [p[0], p[p.length - 2], ultimo].join(' ');
  return p[0] + ' ' + ultimo;
}

/*
 * Texto de recado: sem caracteres de controle, sem espaço sobrando nas linhas e no máximo uma linha em branco seguida.
 * Um apóstrofo no começo sai, como no Apps Script (lá ele é a marca de "guardar como texto").
 */
function textoRecado(s) {
  return String(s == null ? '' : s)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/^'/, '')
    .trim()
    .slice(0, MAX_RECADO)
    .trim();
}

/* Recado atual de um convidado: { convidado, mensagem, oculto }. Escondido pelo casal: o script já manda sem o texto. */
async function lerRecado(id) {
  const u = new URL(url());
  u.searchParams.set('acao', 'recado');
  u.searchParams.set('convidado', id);
  u.searchParams.set('chave', chave());
  const d = await chamar({ url: u });
  if (!d.ok || !d.recado || typeof d.recado.mensagem !== 'string') throw new ErroPlanilha(d.erro || 'resposta_invalida');
  return d.recado;
}

/* Grava (ou substitui) o recado de um convidado. Texto vazio apaga. */
async function salvarRecado(id, mensagem) {
  const d = await chamar({ url: url(), metodo: 'POST', corpo: { chave: chave(), acao: 'recado', convidado: id, mensagem }, timeoutMs: 25000 });
  // Script antigo responde { ok, legado } sem gravar o recado: isso não pode passar como sucesso.
  if (!d.ok || !d.recado || typeof d.recado.mensagem !== 'string') throw new ErroPlanilha(d.erro || 'resposta_invalida');
  cacheRecados.em = 0; // o recado novo entra no próximo pedido do mural
  return d.recado;
}

async function confirmar(dados) {
  const d = await chamar({ url: url(), metodo: 'POST', corpo: Object.assign({ chave: chave(), acao: 'confirmar' }, dados), timeoutMs: 25000 });
  cache.em = Math.min(cache.em, Date.now() - VALIDADE_CACHE + 30 * 1000); // relê a lista logo, caso a planilha tenha mudado
  cacheRecados.em = 0; // um recado novo entra no próximo pedido do mural
  return d;
}

module.exports = {
  configurado, lista, buscar, confirmar, recados, normalizar, ErroPlanilha,
  lerRecado, salvarRecado, nomeCurto, textoRecado, MAX_RECADO, confirmacoesAbertas, prazo,
};
