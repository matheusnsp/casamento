# Lista de presentes + ÚnicoPag

## 1. O que tem aqui

| Arquivo | Para quê |
|---|---|
| `index.html` | Seu site com a aba **Presentes** no menu e o bloco "Lista de presentes" antes do RSVP. Nada mais mudou. |
| `presentes.html` | A página da lista com o checkout (PIX com QR e copia e cola, cartão com parcelas). |
| `presentes.js` | **A lista em si.** Nomes, descrições, valores (em reais) e categorias. É o único arquivo a editar para mudar presentes. A página e o servidor leem o mesmo arquivo. |
| `images/` | As 5 fotos do site (`foto-01` a `foto-05`), iguais às que estão no ar. |
| `js/qrcode.min.js` | Gera o QR code do PIX no navegador (biblioteca MIT). |
| `api/*.js` | Funções que falam com a ÚnicoPag. O token fica só aqui, nunca no navegador. |
| `vercel.json` | Roda as funções em São Paulo (`gru1`), perto da ÚnicoPag, com até 30 s de limite. |

O zip é o site completo: dá para publicar a pasta inteira como está.

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Obrigatória | Valor |
|---|---|---|
| `UNICOPAG_API_TOKEN` | sim | Token de API da conta ÚnicoPag. Cole direto na Vercel, não mande por chat. |
| `SITE_URL` | sim | `https://www.mariaeduardabernardo.com.br` (com www, para o aviso de pagamento não cair no redirecionamento). |
| `UNICOPAG_SELLER_DOCUMENT` | recomendada | CPF ou CNPJ do titular da conta. Vai no metadata antifraude (`seller_document`). |
| `UNICOPAG_TMX_ORG_ID` e `UNICOPAG_TMX_MERCHANT_ID` | opcional | IDs do antifraude ThreatMetrix, se a ÚnicoPag fornecer para a conta. Com os dois, a página carrega o script e envia o `dfp_id`. |
| `NOTIFICACAO_URL` | opcional | Webhook (Make, Apps Script…) que recebe um JSON a cada presente **pago**: presente, valor, forma, convidado e mensagem. |

Marque **Production** (e **Preview**, se for testar num link de preview). Depois de criar ou mudar variável, faça um novo deploy.

## 3. Como publicar

1. Extraia o zip numa pasta: ela já é o site inteiro, com as fotos.
2. Publique do mesmo jeito que o site já é publicado (ex.: `vercel --prod` dentro da pasta). As funções da pasta `api/` só funcionam em deploy pela CLI ou pelo Git.
3. Abra `https://www.mariaeduardabernardo.com.br/api/config` e confira se aparece `"pagamentos":true`.
4. Abra `/presentes.html?teste=1`: aparece o item "Teste de pagamento" (R$ 1,00, só PIX). Pague e confira se a tela de obrigado aparece sozinha.
5. Se quiser, teste o cartão com um presente real e estorne pelo painel.

Sem o token, a lista aparece com os botões em "Em breve", então dá para publicar antes da conta ficar pronta.

**Abrindo no computador** (duplo clique no arquivo ou servidor local): a lista e o checkout aparecem com um aviso de cópia local, mas o pagamento só funciona no site publicado, porque as funções rodam na Vercel. Para testar pagamento antes de ir para o ar, rode `vercel` (sem `--prod`) e use o link de preview.

## 4. Webhook na ÚnicoPag

Não é obrigatório: cada cobrança já leva o próprio endereço de aviso (`postback_url`). Se deixar o webhook da conta ligado (Integrações → Webhooks), use `https://www.mariaeduardabernardo.com.br/api/webhook`. Os avisos repetidos não fazem mal: o site confere cada um direto na API e manda a notificação uma vez só.

## 5. Editar a lista (`presentes.js`)

- `valor` em reais: `89.9` = R$ 89,90.
- `id` único, só letras minúsculas, números e hífen. Não mude o `id` de um presente que já recebeu pagamento.
- `"oculto": true` tira o presente da lista sem apagar.
- `"somentePix": true` bloqueia o cartão naquele item.
- `categorias`: a ordem delas é a ordem das seções e dos atalhos no topo da página. Para mudar um presente de seção, troque o `categoria` dele (o `id` e os pagamentos continuam os mesmos).
- Fotos: `images/presentes/<id>.webp`, quadradas, 600 x 600 px. Produto em fundo branco, ou foto de cena para experiências.
- `valorLivre`: mínimo, máximo e as sugestões de valor. `cartao`: liga/desliga o cartão, valor mínimo e máximo de parcelas.
- Ícones: `aviao, hotel, jantar, barco, cafe, drinks, panela, airfryer, cafeteira, toalhas, bule, sofa, pizza, pipoca, churrasqueira, planta, presente`.
- Link direto para um presente: `/presentes.html?presente=jantar-romantico`.

## 6. Como funciona por dentro

1. O convidado escolhe o presente e preenche nome, e-mail, CPF e celular (e uma mensagem, se quiser).
2. `POST /api/pagar` busca o valor **no catálogo** (o valor do navegador só vale no valor livre) e cria o pagamento em `POST /public/v1/payments`.
3. PIX: a página mostra o QR e o copia e cola e consulta `/api/status` até ficar `paid`. Se o convidado sair para pagar e voltar, o PIX pendente continua salvo no navegador por 24 h.
4. Cartão: vai o valor base mais o número de parcelas, e os juros ficam por conta da ÚnicoPag (evita cobrar juros duas vezes). Os dados do cartão só passam pela função: não são gravados nem aparecem em log.
5. O aviso de pagamento (`/api/webhook`) não tem assinatura, então o status é sempre conferido em `GET /public/v1/transactions/:hash` antes de valer.
6. Limites contra abuso: 10 tentativas de cartão por IP a cada 15 min, 5 por CPF e 4 por cartão a cada 30 min, e 30 PIX por IP a cada 10 min.

Nos logs da Vercel, procure por `pagamento_criado`, `pagamento_erro`, `webhook` e `limite_tentativas` (bloqueios por excesso de tentativas, sem CPF nem cartão no log).

## 7. Mural de recados

- Toda mensagem deixada na confirmação de presença aparece no mural do site (entre Presentes e Confirmar presença), num carrossel que gira sem parar. Isso vale também para as mensagens que chegaram antes do mural. Embaixo do campo de mensagem, o formulário avisa que o recado aparece no mural.
- Para esconder um recado, escreva `Não` na coluna **Mural** da aba Convidados (a coluna é criada sozinha pelo Apps Script). Apagar o `Não` mostra de novo. Se a pessoa mandar outro recado depois, o `Não` continua valendo.
- O site mostra só o primeiro e o último nome e o texto (nada de e-mail, presença ou restrição). Uma mudança na planilha aparece em até uns 10 minutos.
- Recados que entraram pelo formulário antigo (aba Untitled, ou "formulário antigo" em Respostas do site) não estão na aba Convidados. Para eles aparecerem, copie o texto para a coluna Mensagem da pessoa.
- Sem nenhum recado, a seção não aparece.
- `GET /api/recados` lê os recados pelo Apps Script (`acao=recados`), que precisa estar na versão `2026-10-04.4` ou mais nova. Não há limite prático de recados: aparece um por convidado.
