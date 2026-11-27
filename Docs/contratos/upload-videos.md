# Contrato mobile de evidências

## Upload binário atualmente implementado

O mobile usa `POST /api/my/tasks/{task}/evidence`, autenticado, com multipart `file`. A API aceita JPG/JPEG, PNG, WEBP, HEIC/HEIF para fotografias (10 MB) e MP4/MOV para vídeo (50 MB). A API guarda o ficheiro no armazenamento privado e responde `201` com `data.id`, `data.kind`, `data.mime_type` e `data.size_bytes`. O mobile só mostra confirmação após validar esta resposta.

A duração de 60 segundos é aplicada pelo seletor/câmara mobile, segundo a decisão documentada, mas o endpoint de produção da API não valida duração. Portanto, não é uma garantia do servidor. O limite de 100 MB que aparece em registos anteriores está em conflito com o endpoint atual; para esta integração prevalecem os limites efetivamente aplicados pela API: 10 MB para foto e 50 MB para vídeo.

O endpoint recebe apenas o ficheiro: não aceita fase, chave de idempotência, nome de etapa ou tipo inicial/final. Uma falha de rede pode deixar o resultado do upload desconhecido. A app avisa que o ficheiro pode ter sido recebido e não afirma sucesso nem recomenda repetir imediatamente; o backend não oferece reconciliação idempotente para este endpoint.

A proposta previamente acordada de um vídeo inicial e um final por tarefa não pode ser garantida por este endpoint: não há campo de fase nem validação de quantidade no servidor. A app separa os IDs na interface até os associar à execução ou vistoria, mas não consegue impor a quantidade entre reaberturas. É necessária uma decisão/alteração contratual da equipa para impor esse limite de forma durável.

## Associação à execução e fase

Os IDs devolvidos são enviados em `evidence_ids` para `POST /api/my/tasks/{task}/executions` (prova anterior e checklist) ou `POST /api/my/tasks/{task}/checkout-inspection` (prova posterior/vistoria de saída). A associação é persistida no registo correspondente. A API confirma `201`, ou `200` para retry idêntico, com os IDs; a mesma chave com conteúdo diferente devolve `409`. O mobile guarda o envio pendente no SecureStore e reenvia payload e chave sem alteração. Logout limpa os envios pendentes locais. Um `422` definitivo na execução remove o pendente para permitir correção; para a vistoria, o `422` pode significar que ainda não chegou a hora de check-out, pelo que o payload/chave ficam pendentes para retry posterior.

O upload binário, por si só, não fica ligado a uma fase. Uma prova enviada sem confirmação pode ficar armazenada sem associação a uma execução. Os IDs confirmados ficam na memória do detalhe até serem ligados à execução/vistoria e não são apresentados ao prestador; se a app for encerrada antes dessa ligação, a API não disponibiliza ao prestador uma listagem para recuperar o ID, pelo que a reconciliação fica pendente. O mobile não apaga evidências confirmadas.

## Checklist e observações

O mobile obtém a checklist ligada à tarefa através de `GET /api/my/tasks/{task}/checklist`. Usa os IDs e rótulos devolvidos pela versão atribuída à tarefa; apresenta nome, versão, itens, obrigatoriedade e progresso. Quando não há checklist, a API devolve `200` com `{ "data": null }`. Para alterar um item, envia `PATCH /api/my/tasks/{task}/checklist/items/{itemId}` com `{ "done": true }` ou `{ "done": false }`. A API devolve a checklist atualizada. A marcação só é permitida enquanto a tarefa está em curso; `404` representa tarefa/item sem acesso ou inexistente e `422` inclui dados inválidos ou tarefa fora de curso. A consulta e a escrita usam autenticação e o endpoint do prestador só permite tarefas atualmente atribuídas a esse prestador.

As respostas da checklist são guardadas pela API por item e não são repetidas em `responses[]` da execução. As observações continuam em `observations` (máximo 5000 caracteres) no pedido de execução. Se a alteração do item falhar ou a resposta se perder, o mobile mantém o valor pretendido e permite repetir o mesmo `PATCH`; o valor explícito `done` torna o retry idempotente. O estado mostrado após sucesso vem da checklist completa devolvida pela API.

## Vistoria de saída

`POST /api/my/tasks/{task}/checkout-inspection` regista a vistoria separada, associada à tarefa de limpeza e à reserva, e só é aceite a partir da hora prevista de check-out. A app envia `responses: []`, `observations: null` e os IDs de evidência posterior. O detalhe atual é consultado com `GET /api/my/tasks/{task}/checkout-inspection`. A API permite um registo por tarefa; retry igual devolve `200`, conteúdo diferente ou outra vistoria devolve `409`. A tarefa e a conclusão não são alteradas por este registo.

## Validação manual

1. Entrar como prestador ativo atualmente atribuído a uma tarefa `checkout_cleaning` em curso.
2. Tirar uma fotografia ou gravar um vídeo até 60 segundos, ou escolher um ficheiro compatível na galeria; confirmar na API o sucesso do upload (`201`), sem apresentar o ID na interface.
3. Marcar/desmarcar itens, adicionar observações e guardar a execução; confirmar `send_state: confirmed`.
4. Repetir após simular perda de resposta; confirmar retry com a mesma chave e o mesmo ID (resposta `200`).
5. Depois da hora prevista de check-out, enviar a prova posterior e registar a vistoria; confirmar a associação separada e que só existe uma vistoria.
6. Testar permissões recusadas, formato/tamanho inválido, `401`, `403`, `404`, `409`, `422` e falha de rede. Uma falha no upload binário fica sem garantia de retry idempotente; registar esse limite.
