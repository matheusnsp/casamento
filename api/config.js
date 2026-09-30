'use strict';

/* GET /api/config — o que a página precisa saber para abrir o checkout. Nada aqui é segredo. */

const unicopag = require('./_lib/unicopag');
const catalogo = require('./_lib/catalogo');
const { enviar, metodoNaoPermitido } = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return metodoNaoPermitido(res, 'GET');

  const pronto = unicopag.configurado();
  const cartao = catalogo.regrasCartao();
  const orgId = String(process.env.UNICOPAG_TMX_ORG_ID || '').trim();
  const merchantId = String(process.env.UNICOPAG_TMX_MERCHANT_ID || '').trim();

  enviar(res, 200, {
    ok: true,
    pagamentos: pronto,
    pix: pronto,
    cartao: pronto && cartao.ativo,
    cartaoValorMinimo: cartao.valorMinimo,
    maxParcelas: cartao.maxParcelas,
    valorLivre: catalogo.regrasValorLivre(),
    antifraude: orgId && merchantId ? { orgId, merchantId } : null,
  });
};
