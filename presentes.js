/*
 * LISTA DE PRESENTES — edite só o que está entre as chaves.
 *
 * - valor em reais (ponto nos centavos: 89.9 = R$ 89,90)
 * - id único, só minúsculas, números e hífen; não mude o id de um presente que já recebeu pagamento
 * - "oculto": true tira da lista sem apagar; "somentePix": true bloqueia o cartão no item
 * - ícones: aviao, hotel, jantar, barco, cafe, drinks, panela, airfryer, cafeteira, toalhas,
 *   bule, sofa, pizza, pipoca, churrasqueira, planta, presente
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
    "sugestoes": [
      50,
      100,
      200,
      500
    ]
  },
  "cartao": {
    "ativo": true,
    "valorMinimo": 20,
    "maxParcelas": 12
  },
  "categorias": [
    {
      "id": "lua-de-mel",
      "nome": "Lua de mel",
      "descricao": "Para a nossa primeira viagem como casados."
    },
    {
      "id": "casa-nova",
      "nome": "Casa nova",
      "descricao": "Para montar o nosso primeiro lar."
    },
    {
      "id": "celebrar",
      "nome": "Para celebrar",
      "descricao": "Pequenos momentos para viver a dois."
    }
  ],
  "presentes": [
    {"id": "passagens", "categoria": "lua-de-mel", "icone": "aviao", "nome": "Passagens da lua de mel", "descricao": "Uma cota para o voo da nossa primeira viagem.", "valor": 500},
    {"id": "diaria-hotel", "categoria": "lua-de-mel", "icone": "hotel", "nome": "Uma noite no hotel", "descricao": "Uma diária para descansar depois da festa.", "valor": 450},
    {"id": "passeio-barco", "categoria": "lua-de-mel", "icone": "barco", "nome": "Passeio de barco", "descricao": "Um dia no mar para guardar na memória.", "valor": 350},
    {"id": "jantar-romantico", "categoria": "lua-de-mel", "icone": "jantar", "nome": "Jantar romântico", "descricao": "Um jantar a dois durante a viagem.", "valor": 280},
    {"id": "drinks", "categoria": "lua-de-mel", "icone": "drinks", "nome": "Drinks ao pôr do sol", "descricao": "Um brinde a nós dois no fim da tarde.", "valor": 150},
    {"id": "cafe-da-manha", "categoria": "lua-de-mel", "icone": "cafe", "nome": "Café da manhã especial", "descricao": "Para começar bem um dos dias da viagem.", "valor": 120},
    {"id": "moveis", "categoria": "casa-nova", "icone": "sofa", "nome": "Cota para os móveis", "descricao": "Uma ajuda para mobiliar o nosso primeiro lar.", "valor": 1000},
    {"id": "cafeteira", "categoria": "casa-nova", "icone": "cafeteira", "nome": "Máquina de café", "descricao": "Para as manhãs começarem do jeito certo.", "valor": 700},
    {"id": "panelas", "categoria": "casa-nova", "icone": "panela", "nome": "Jogo de panelas", "descricao": "Para cozinhar juntos na casa nova.", "valor": 600},
    {"id": "airfryer", "categoria": "casa-nova", "icone": "airfryer", "nome": "Air fryer", "descricao": "Praticidade para o dia a dia de recém-casados.", "valor": 450},
    {"id": "aparelho-jantar", "categoria": "casa-nova", "icone": "bule", "nome": "Aparelho de jantar", "descricao": "Para receber a família e os amigos à mesa.", "valor": 400},
    {"id": "cama-banho", "categoria": "casa-nova", "icone": "toalhas", "nome": "Jogo de cama e banho", "descricao": "Lençóis e toalhas novinhos para a casa.", "valor": 350},
    {"id": "churrasco", "categoria": "celebrar", "icone": "churrasqueira", "nome": "Churrasco em família", "descricao": "O primeiro almoço de família na casa nova.", "valor": 250},
    {"id": "pizza", "categoria": "celebrar", "icone": "pizza", "nome": "A primeira pizza em casa", "descricao": "A primeira noite de folga no nosso cantinho.", "valor": 100},
    {"id": "cinema", "categoria": "celebrar", "icone": "pipoca", "nome": "Noite de cinema", "descricao": "Pipoca, filme e sofá.", "valor": 90},
    {"id": "plantas", "categoria": "celebrar", "icone": "planta", "nome": "Plantas para a casa", "descricao": "Um pouco de verde para a varanda.", "valor": 80},
    {"id": "teste-pix", "categoria": "celebrar", "icone": "presente", "nome": "Teste de pagamento", "descricao": "Só aparece com ?teste=1 no endereço. Aceita apenas PIX.", "valor": 1, "oculto": true, "somentePix": true}
  ]
});
