'use strict';

/*
 * Lista de convidados e confirmações, via Apps Script da planilha.
 * A lista inteira só circula entre a Vercel e o Google (protegida pela chave);
 * a página recebe apenas os nomes que batem com o que a pessoa digitou.
 */

const URL_PADRAO = 'https://script.google.com/macros/s/AKfycbwV6qSx2ZkaSkOMI0qB-uKXD7_g_Rygag3Dh-7OhOCU0agx7BO5p1Bhc6cjH8AeC3kHmA/exec';
const VALIDADE_CACHE = 5 * 60 * 1000;
let cache = { em: 0, lista: null };

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

async function confirmar(dados) {
  const d = await chamar({ url: url(), metodo: 'POST', corpo: Object.assign({ chave: chave(), acao: 'confirmar' }, dados), timeoutMs: 25000 });
  cache.em = Math.min(cache.em, Date.now() - VALIDADE_CACHE + 30 * 1000); // relê a lista logo, caso a planilha tenha mudado
  return d;
}

module.exports = { configurado, lista, buscar, confirmar, normalizar, ErroPlanilha };
