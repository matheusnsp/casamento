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

- O recado tem formulário próprio, no fim do mural (menu **Recados**). A pessoa busca o nome na lista de convidados e escreve. A confirmação de presença não tem mais campo de mensagem.
- **Um recado por convidado**, na coluna **Mensagem** da aba Convidados. Se a pessoa voltar, o recado que ela deixou aparece preenchido para editar; salvar de novo substitui o anterior. "Apagar meu recado" (pede dois toques) tira o recado do mural.
- Cada envio fica registrado na aba **Respostas do site** (origem "recado novo", "recado editado" ou "recado apagado"), com o texto anterior na coluna **Recado anterior**. A coluna **Recado em** guarda quando foi escrito: o mural mostra os mais novos primeiro.
- Como na confirmação, quem souber o nome de um convidado consegue escrever no lugar dele. O histórico acima mostra o que mudou, e o casal pode esconder qualquer recado.
- Para esconder um recado, escreva `Não` na coluna **Mural** da aba Convidados (a coluna é criada sozinha pelo Apps Script). Apagar o `Não` mostra de novo. Se a pessoa editar o recado depois, o `Não` continua valendo.
- Recado escondido também não aparece no formulário: quem escolher aquele nome só vê o aviso de que já existe um recado guardado com os noivos, e pode escrever outro por cima (o anterior fica no histórico).
- Tudo o que a pessoa digita (recado, e-mail, restrição) entra na planilha como texto puro. Um recado que comece com `=` não vira fórmula, e `50%` não vira número.
- O site mostra só o primeiro e o último nome e o texto (nada de e-mail, presença ou restrição). Uma mudança na planilha aparece em até uns 10 minutos; quem acabou de escrever já vê o próprio recado na hora.
- Recados que entraram pelo formulário antigo (aba Untitled, ou "formulário antigo" em Respostas do site) não estão na aba Convidados. Para eles aparecerem, copie o texto para a coluna Mensagem da pessoa.
- Sem nenhum recado, o carrossel não aparece; o formulário continua lá.
- Quando os recados não cabem na tela, o carrossel gira sozinho e dá para arrastar para os dois lados (dedo no celular; mouse, trackpad ou setas do teclado no computador). Depois que a pessoa mexe, ele espera 5 segundos e volta a girar. Para quem pediu menos movimento no aparelho, ou com só 1 ou 2 recados, ele não gira: só arrasta.
- O recado continua aberto depois do prazo da confirmação.
- `GET /api/recados` (mural) e `GET/POST /api/recado` (recado de um convidado) usam o Apps Script, que precisa estar na versão `2026-10-08.2` ou mais nova. Limites: 60 leituras e 20 envios por IP a cada 10 min; recado de até 500 caracteres.

## 8. Prazo para confirmar presença

- As confirmações fecham às **23h59 de 20/12/2026** (horário de Brasília). Depois disso a página troca o formulário por um aviso de encerramento, e o servidor recusa qualquer confirmação (`403 prazo_encerrado`), mesmo de quem estiver com a página aberta.
- Para mudar o prazo, troque a data no código e publique de novo (commit e push). São estes lugares:
  1. `index.html`: `PRAZO_CONFIRMACAO` (o que a página usa para fechar o formulário) e os três textos com "20 de dezembro" (o aviso acima do formulário, o painel de encerrado e o texto que aparece quando fecha).
  2. `api/_lib/presenca.js`: `PRAZO_PADRAO` (o que o servidor aceita).
  3. `api/presenca.js`: a mensagem de erro com "20 de dezembro".
- Mudar só um dos lados não funciona: se só o servidor mudar, a página continua fechando no dia 20. A variável `PRESENCA_PRAZO` que aparece no código serve só para testes.
