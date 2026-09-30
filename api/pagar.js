'use strict';

/*
 * POST /api/pagar — cria o pagamento do presente na ÚnicoPag (PIX ou cartão).
 * O valor sempre sai do catálogo (presentes.json). Dados do cartão só passam por aqui a caminho
 * da ÚnicoPag: não são gravados nem aparecem em log.
 */

const crypto = require('crypto');
const unicopag = require('./_lib/unicopag');
const catalogo = require('./_lib/catalogo');
const u = require('./_lib/util');

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* Campo da ÚnicoPag -> [campo do formulário, mensagem]. */
const CAMPOS_API = {
  'customer.name': ['nome', 'Informe nome e sobrenome.'],
  'customer.email': ['email', 'Confira o e-mail.'],
  'customer.document': ['cpf', 'Confira o CPF.'],
  'customer.phone_number': ['telefone', 'Confira o celular com DDD.'],
  'card.number': ['cartaoNumero', 'Confira o número do cartão.'],
  'card.holdername': ['cartaoNome', 'Digite o nome como está no cartão.'],
  'card.exp_month': ['cartaoValidade', 'Confira a validade do cartão.'],
  'card.exp_year': ['cartaoValidade', 'Confira a validade do cartão.'],
  'card.cvv': ['cartaoCvv', 'Confira o código de segurança.'],
  installments: ['parcelas', 'Escolha o número de parcelas de novo.'],
  amount: ['valor', 'Confira o valor do presente.'],
};

function validarCartao(c, erros) {
  const numero = u.soDigitos(c.numero);
  const nome = u.limparTexto(c.nome, 60).replace(/\s+/g, ' ');
  const cvv = u.soDigitos(c.cvv);
  const validade = u.soDigitos(c.validade);
  let mes = NaN;
  let ano = NaN;
  if (validade.length === 4) {
    mes = parseInt(validade.slice(0, 2), 10);
    ano = 2000 + parseInt(validade.slice(2), 10);
  } else if (validade.length === 6) {
    mes = parseInt(validade.slice(0, 2), 10);
    ano = parseInt(validade.slice(2), 10);
  }
  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth() + 1;

  if (numero.length < 13 || numero.length > 19 || !u.luhnValido(numero)) erros.cartaoNumero = 'Confira o número do cartão.';
  if (!/^[\p{L}][\p{L} '.\-]{1,59}$/u.test(nome)) erros.cartaoNome = 'Digite o nome como está no cartão.';
  if (!(mes >= 1 && mes <= 12) || !(ano >= anoAtual && ano <= anoAtual + 20) || (ano === anoAtual && mes < mesAtual)) {
    erros.cartaoValidade = 'Confira a validade do cartão.';
  }
  if (cvv.length < 3 || cvv.length > 4) erros.cartaoCvv = 'Confira o código de segurança.';

  return { number: numero, holdername: nome, exp_month: String(mes).padStart(2, '0'), exp_year: String(ano), cvv };
}

function rastreio(utm) {
  const t = { src: 'site-casamento' };
  if (utm && typeof utm === 'object') {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = u.limparTexto(utm[k], 120);
      if (v) t[k] = v;
    }
  }
  return t;
}

function responderErro(res, e, ctx) {
  const erros = e.dados && e.dados.errors && typeof e.dados.errors === 'object' ? e.dados.errors : null;
  const campos = erros ? Object.keys(erros) : undefined;
  console.error(JSON.stringify({ evt: 'pagamento_erro', ...ctx, http: e.status, msg: String(e.message || '').slice(0, 200), campos }));

  if (e.status === 422 || (e.status === 400 && campos && campos.length)) {
    const chave = (campos || []).find((c) => CAMPOS_API[c]);
    if (chave) {
      const [campo, msg] = CAMPOS_API[chave];
      return u.erro(res, 400, 'dados_invalidos', msg, { campos: { [campo]: msg } });
    }
    return u.erro(res, 400, 'dados_invalidos', 'Confira os dados e tente de novo.');
  }
  if (e.status === 401 || e.status === 403) {
    return u.erro(res, 503, 'indisponivel', 'Os pagamentos estão indisponíveis no momento. Tente de novo mais tarde.');
  }
  if (e.status === 400 || e.status === 402) {
    return u.erro(res, 400, 'recusado', ctx.metodo === 'cartao'
      ? 'O pagamento não foi aprovado. Confira os dados do cartão ou pague com PIX.'
      : 'Não foi possível gerar o PIX. Tente de novo em instantes.');
  }
  if (e.message === 'tempo_esgotado' && ctx.metodo === 'cartao') {
    return u.erro(res, 504, 'incerto', 'A confirmação demorou mais que o normal. Antes de tentar de novo, veja no app do seu cartão se a compra apareceu.');
  }
  return u.erro(res, 502, 'instavel', 'Não conseguimos falar com o sistema de pagamento. Tente de novo em instantes.');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return u.metodoNaoPermitido(res, 'POST');
  if (!unicopag.configurado()) {
    return u.erro(res, 503, 'indisponivel', 'Os pagamentos ainda não foram ativados. Tente de novo mais tarde.');
  }

  let b;
  try {
    b = await u.lerCorpo(req);
  } catch (e) {
    return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.');
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return u.erro(res, 400, 'corpo_invalido', 'Não foi possível ler os dados enviados.');

  // Campo invisível: só robô preenche.
  if (b.hp) return u.erro(res, 400, 'recusado', 'Não foi possível concluir o pagamento.');

  const metodo = b.metodo === 'cartao' ? 'cartao' : b.metodo === 'pix' ? 'pix' : null;
  if (!metodo) return u.erro(res, 400, 'metodo_invalido', 'Escolha PIX ou cartão.');

  // Folga por IP (convidados na mesma rede móvel ou no Wi-Fi da festa dividem IP);
  // o freio contra teste de cartão fica no CPF e no próprio cartão, mais abaixo.
  const [maximo, janela] = metodo === 'cartao' ? [10, 15 * 60 * 1000] : [30, 10 * 60 * 1000];
  if (!u.dentroDoLimite(`pagar:${metodo}:${u.ipDe(req)}`, maximo, janela)) {
    console.warn(JSON.stringify({ evt: 'limite_tentativas', metodo, motivo: 'ip' }));
    return u.erro(res, 429, 'muitas_tentativas', 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
  }

  const presente = catalogo.buscar(b.presente);
  if (!presente) return u.erro(res, 400, 'presente_invalido', 'Este presente não está mais na lista. Atualize a página.');

  let valor = presente.valorCentavos;
  if (presente.livre) {
    const v = catalogo.valorLivreEmCentavos(b.valor);
    if (!v.ok) {
      const msg = `Escolha um valor entre ${brl(v.regras.minimo)} e ${brl(v.regras.maximo)}.`;
      return u.erro(res, 400, 'dados_invalidos', msg, { campos: { valor: msg } });
    }
    valor = v.valor;
  }

  const erros = {};
  const nome = u.limparTexto(b.nome, 120).replace(/\s+/g, ' ');
  const email = u.limparTexto(b.email, 160).toLowerCase();
  const cpf = u.soDigitos(b.cpf);
  const telefone = u.soDigitos(b.telefone);
  const mensagem = u.limparTexto(b.mensagem, 300);
  if (!u.nomeValido(nome)) erros.nome = 'Informe nome e sobrenome.';
  if (!u.emailValido(email)) erros.email = 'Confira o e-mail.';
  if (!u.cpfValido(cpf)) erros.cpf = 'Confira o CPF.';
  if (!u.telefoneValido(telefone)) erros.telefone = 'Informe o celular com DDD.';

  const regrasCartao = catalogo.regrasCartao();
  let parcelas = 1;
  let cartao = null;
  if (metodo === 'cartao') {
    if (!regrasCartao.ativo || presente.somentePix) return u.erro(res, 400, 'cartao_indisponivel', 'Este presente aceita apenas PIX.');
    if (valor < regrasCartao.valorMinimo) {
      return u.erro(res, 400, 'valor_minimo_cartao', `No cartão, o valor mínimo é ${brl(regrasCartao.valorMinimo)}.`);
    }
    parcelas = parseInt(b.parcelas, 10);
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > regrasCartao.maxParcelas) erros.parcelas = 'Escolha o número de parcelas.';
    cartao = validarCartao(b.cartao && typeof b.cartao === 'object' ? b.cartao : {}, erros);
  }
  if (Object.keys(erros).length) {
    return u.erro(res, 400, 'dados_invalidos', Object.values(erros)[0], { campos: erros });
  }

  if (cartao) {
    const impressao = crypto.createHash('sha256').update(cartao.number).digest('hex').slice(0, 24);
    const meiaHora = 30 * 60 * 1000;
    const porCpf = u.dentroDoLimite('cartao:cpf:' + cpf, 5, meiaHora);
    const porCartao = u.dentroDoLimite('cartao:num:' + impressao, 4, meiaHora);
    if (!porCpf || !porCartao) {
      console.warn(JSON.stringify({ evt: 'limite_tentativas', metodo, motivo: !porCartao ? 'cartao' : 'cpf', presente: presente.id }));
      return u.erro(res, 429, 'muitas_tentativas', 'Muitas tentativas com estes dados. Espere meia hora ou pague com PIX.');
    }
  }

  const pedido = 'pres_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const agora = u.dataHoraSP();
  const site = u.urlDoSite();
  const documentoRecebedor = u.soDigitos(process.env.UNICOPAG_SELLER_DOCUMENT);

  const payload = {
    amount: valor,
    payment_method: metodo === 'cartao' ? 'credit_card' : 'pix',
    installments: parcelas,
    customer: { name: nome, email, phone_number: telefone, document: cpf },
    cart: [{ hash: presente.id, title: presente.nome, price: valor, quantity: 1, operation_type: 1 }],
    expire_in_days: 1,
    origin: 'lista-de-presentes',
    metadata: {
      order_id: pedido,
      presente_id: presente.id,
      presente_nome: presente.nome,
      mensagem: mensagem || undefined,
      // Convidado não tem histórico: as datas são as do próprio pedido (é o dado real).
      customer_created_at: agora,
      customer_first_transaction_at: agora,
      customer_last_transaction_at: agora,
      number_paid_proposals: 0,
      seller_document: documentoRecebedor || undefined,
    },
    tracking: rastreio(b.utm),
  };
  if (cartao) payload.card = cartao;
  if (/^https:\/\//.test(site)) payload.postback_url = site + '/api/webhook';
  const dfp = String(b.dfp || '');
  if (/^[A-Za-z0-9_-]{6,64}$/.test(dfp)) payload.dfp_id = dfp;

  const ctx = { pedido, metodo, presente: presente.id, valor, parcelas };
  let t;
  try {
    t = unicopag.normalizarTransacao(await unicopag.criarPagamento(payload));
  } catch (e) {
    return responderErro(res, e, ctx);
  } finally {
    if (payload.card) payload.card = null;
  }

  const grupo = unicopag.grupoDoStatus(t.status);
  console.log(JSON.stringify({ evt: 'pagamento_criado', ...ctx, status: t.status, hash: t.hash }));

  if (!t.hash) {
    return u.erro(res, 502, 'resposta_incompleta', 'O sistema de pagamento não confirmou o pedido. Tente de novo em instantes.');
  }

  if (metodo === 'pix') {
    if (!t.pix.codigo && !t.pix.imagem && grupo !== 'pago') {
      return u.erro(res, 502, 'pix_nao_gerado', 'O PIX não foi gerado. Tente de novo em instantes.');
    }
    return u.enviar(res, 200, {
      ok: true, id: t.hash, status: t.status, grupo, valor,
      pix: { codigo: t.pix.codigo, imagem: t.pix.imagem },
    });
  }

  return u.enviar(res, 200, { ok: true, id: t.hash, status: t.status, grupo, valor, parcelas, total: t.total });
};
