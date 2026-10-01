/*
 * LISTA DE PRESENTES — edite só o que está entre as chaves.
 *
 * - valor em reais (ponto nos centavos: 89.9 = R$ 89,90)
 * - id único, só minúsculas, números e hífen; não mude o id de um presente que já recebeu pagamento
 * - foto: imagem quadrada com fundo branco (600 x 600 px) na pasta images/presentes; sem foto, aparece um ícone
 * - descricao (opcional): uma frase curta embaixo do nome
 * - "oculto": true tira da lista sem apagar; "somentePix": true bloqueia o cartão no item
 * - a ordem aqui é a ordem em que os presentes aparecem na página
 *
 * Este arquivo é lido pela página e pelo servidor (o servidor cobra sempre o valor daqui).
 */
(function (lista) {
  if (typeof module === 'object' && module.exports) module.exports = lista;
  else window.LISTA_DE_PRESENTES = lista;
})({
  "valorLivre": {
    "ativo": true,
    "minimo": 20,
    "maximo": 10000,
    "sugestoes": [50, 100, 200, 500]
  },
  "cartao": {
    "ativo": true,
    "valorMinimo": 20,
    "maxParcelas": 12
  },
  "categorias": [
    {"id": "mesa", "nome": "Mesa posta", "descricao": "Para receber a família e os amigos."},
    {"id": "cozinha", "nome": "Cozinha", "descricao": "Para cozinhar juntos."},
    {"id": "eletros", "nome": "Eletrodomésticos", "descricao": "Para o dia a dia da casa."},
    {"id": "casa", "nome": "Casa", "descricao": "Os detalhes que fazem um lar."}
  ],
  "presentes": [
    {"id": "tabua-de-frios", "categoria": "mesa", "nome": "Tábua de frios", "valor": 44.89, "foto": "images/presentes/tabua-de-frios.webp"},
    {"id": "conjunto-frios", "categoria": "mesa", "nome": "Conjunto para frios", "valor": 72.3, "foto": "images/presentes/conjunto-frios.webp"},
    {"id": "pratos-quadrados", "categoria": "mesa", "nome": "Jogo de pratos quadrados", "valor": 75.72, "foto": "images/presentes/pratos-quadrados.webp"},
    {"id": "sousplats", "categoria": "mesa", "nome": "Conjunto de sousplats", "valor": 100.85, "foto": "images/presentes/sousplats.webp"},
    {"id": "talheres-pizza", "categoria": "mesa", "nome": "Kit de talheres para pizza", "valor": 123.58, "foto": "images/presentes/talheres-pizza.webp"},
    {"id": "sobremesa-viena", "categoria": "mesa", "nome": "Jogo de sobremesa Viena (vidro)", "valor": 136.26, "foto": "images/presentes/sobremesa-viena.webp"},
    {"id": "comida-oriental", "categoria": "mesa", "nome": "Conjunto para comida oriental", "valor": 217.35, "foto": "images/presentes/comida-oriental.webp"},
    {"id": "tacas-vinho", "categoria": "mesa", "nome": "Conjunto de taças para vinho", "valor": 234.48, "foto": "images/presentes/tacas-vinho.webp"},
    {"id": "aparelho-jantar-estampado", "categoria": "mesa", "nome": "Aparelho de jantar azul estampado", "valor": 249.33, "foto": "images/presentes/aparelho-jantar-estampado.webp"},
    {"id": "petisqueira", "categoria": "mesa", "nome": "Petisqueira giratória de bambu", "valor": 320.14, "foto": "images/presentes/petisqueira.webp"},
    {"id": "aparelho-fondue", "categoria": "mesa", "nome": "Aparelho de fondue", "valor": 461.77, "foto": "images/presentes/aparelho-fondue.webp"},
    {"id": "aparelho-jantar-relevo", "categoria": "mesa", "nome": "Aparelho de jantar branco com relevo", "valor": 477.76, "foto": "images/presentes/aparelho-jantar-relevo.webp"},
    {"id": "aparelho-jantar-perolado", "categoria": "mesa", "nome": "Aparelho de jantar com borda perolada", "valor": 477.76, "foto": "images/presentes/aparelho-jantar-perolado.webp"},
    {"id": "aparelho-jantar-azul", "categoria": "mesa", "nome": "Aparelho de jantar azul-claro", "valor": 507.45, "foto": "images/presentes/aparelho-jantar-azul.webp"},
    {"id": "faqueiro-42", "categoria": "mesa", "nome": "Faqueiro 42 peças", "valor": 598.83, "foto": "images/presentes/faqueiro-42.webp"},
    {"id": "faqueiro-101", "categoria": "mesa", "nome": "Faqueiro 101 peças", "valor": 705.04, "foto": "images/presentes/faqueiro-101.webp"},
    {"id": "aparelho-jantar-dourado", "categoria": "mesa", "nome": "Aparelho de jantar com filete dourado", "valor": 1691.86, "foto": "images/presentes/aparelho-jantar-dourado.webp"},
    {"id": "faqueiro-84", "categoria": "mesa", "nome": "Faqueiro 84 peças", "valor": 1835.77, "foto": "images/presentes/faqueiro-84.webp"},
    {"id": "colher-de-pau", "categoria": "cozinha", "nome": "Colher de pau", "valor": 33.46, "foto": "images/presentes/colher-de-pau.webp"},
    {"id": "pano-de-prato", "categoria": "cozinha", "nome": "Pano de prato", "valor": 36.89, "foto": "images/presentes/pano-de-prato.webp"},
    {"id": "forma-pudim", "categoria": "cozinha", "nome": "Forma de pudim", "valor": 57.45, "foto": "images/presentes/forma-pudim.webp"},
    {"id": "potes-hermeticos", "categoria": "cozinha", "nome": "Potes herméticos", "valor": 66.59, "foto": "images/presentes/potes-hermeticos.webp"},
    {"id": "porta-condimentos", "categoria": "cozinha", "nome": "Porta-condimentos com suporte", "valor": 82.58, "foto": "images/presentes/porta-condimentos.webp"},
    {"id": "assadeiras-vidro", "categoria": "cozinha", "nome": "Assadeiras de vidro Marinex (4 peças)", "valor": 146.42, "foto": "images/presentes/assadeiras-vidro.webp"},
    {"id": "travessas-lasanha", "categoria": "cozinha", "nome": "Travessas refratárias Oxford para lasanha", "valor": 249.32, "foto": "images/presentes/travessas-lasanha.webp"},
    {"id": "panelas-tramontina", "categoria": "cozinha", "nome": "Jogo de panelas Tramontina Solar (6 peças)", "valor": 705.04, "foto": "images/presentes/panelas-tramontina.webp"},
    {"id": "cafeteira", "categoria": "eletros", "nome": "Cafeteira Cadence Single Colors vermelha (110 V)", "valor": 78.01, "foto": "images/presentes/cafeteira.webp"},
    {"id": "liquidificador", "categoria": "eletros", "nome": "Liquidificador", "valor": 143.11, "foto": "images/presentes/liquidificador.webp"},
    {"id": "batedeira", "categoria": "eletros", "nome": "Batedeira Philco 4 velocidades", "valor": 157.96, "foto": "images/presentes/batedeira.webp"},
    {"id": "torradeira", "categoria": "eletros", "nome": "Torradeira Ford 2 fatias inox", "valor": 249.21, "foto": "images/presentes/torradeira.webp"},
    {"id": "air-fryer", "categoria": "eletros", "nome": "Fritadeira air fryer", "valor": 316.72, "foto": "images/presentes/air-fryer.webp"},
    {"id": "purificador", "categoria": "eletros", "nome": "Purificador de água Electrolux com painel touch", "valor": 555.24, "foto": "images/presentes/purificador.webp"},
    {"id": "micro-ondas", "categoria": "eletros", "nome": "Micro-ondas Philco 25 litros", "valor": 591.97, "foto": "images/presentes/micro-ondas.webp"},
    {"id": "forno-eletrico", "categoria": "eletros", "nome": "Forno elétrico", "valor": 1207.59, "foto": "images/presentes/forno-eletrico.webp"},
    {"id": "lavadora", "categoria": "eletros", "nome": "Lavadora de roupas Brastemp Ative! 11 kg", "valor": 1473.71, "foto": "images/presentes/lavadora.webp"},
    {"id": "ar-condicionado", "categoria": "eletros", "nome": "Ar-condicionado split LG Inverter 11.500 BTUs quente/frio", "valor": 2190.98, "foto": "images/presentes/ar-condicionado.webp"},
    {"id": "smart-tv", "categoria": "eletros", "nome": "Smart TV Samsung 42 polegadas", "valor": 2190.98, "foto": "images/presentes/smart-tv.webp"},
    {"id": "lava-loucas", "categoria": "eletros", "nome": "Lava-louças de piso", "valor": 3061.29, "foto": "images/presentes/lava-loucas.webp"},
    {"id": "lava-e-seca", "categoria": "eletros", "nome": "Lava e seca Brastemp", "valor": 3218.91, "foto": "images/presentes/lava-e-seca.webp"},
    {"id": "geladeira", "categoria": "eletros", "nome": "Geladeira", "valor": 3276.01, "foto": "images/presentes/geladeira.webp"},
    {"id": "porta-chaves", "categoria": "casa", "nome": "Porta-chaves", "valor": 82.58, "foto": "images/presentes/porta-chaves.webp"},
    {"id": "cesto-de-roupa", "categoria": "casa", "nome": "Cesto de roupa", "valor": 99.71, "foto": "images/presentes/cesto-de-roupa.webp"},
    {"id": "mesa-multiuso", "categoria": "casa", "nome": "Mesa multiuso Tramontina preta", "valor": 111.13, "foto": "images/presentes/mesa-multiuso.webp"},
    {"id": "rotuladora", "categoria": "casa", "nome": "Rotuladora eletrônica Brother PT-80", "valor": 213.92, "foto": "images/presentes/rotuladora.webp"},
    {"id": "jogo-de-banho", "categoria": "casa", "nome": "Jogo de banho gigante", "valor": 219.63, "foto": "images/presentes/jogo-de-banho.webp"},
    {"id": "kit-banheiro", "categoria": "casa", "nome": "Conjunto de acessórios para banheiro", "valor": 325.85, "foto": "images/presentes/kit-banheiro.webp"},
    {"id": "cristaleira", "categoria": "casa", "nome": "Cristaleira", "valor": 934.62, "foto": "images/presentes/cristaleira.webp"},
    {"id": "teste-pix", "categoria": "casa", "nome": "Teste de pagamento", "descricao": "Só aparece com ?teste=1 no endereço. Aceita apenas PIX.", "valor": 1, "oculto": true, "somentePix": true}
  ]
});
