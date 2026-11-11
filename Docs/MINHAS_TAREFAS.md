# Minhas Tarefas e Agenda — integração com a API

A lista consulta `GET /api/tasks` e o detalhe consulta `GET /api/tasks/{task}` através de `authenticatedFetch`. O Bearer token vem da sessão; a API identifica o prestador e limita o acesso às tarefas atualmente atribuídas. Não há seletor de prestador nem dados fictícios neste percurso.

## Dados apresentados

- A lista recebe `id`, `property`, `type`, `scheduled_start_at` e `status`. Os cartões não mostram morada nem duração, porque esses dados não fazem parte da resposta da lista.
- Os separadores **Tarefas** e **Agenda** usam a mesma lista autenticada. **Tarefas** mostra **Hoje**, **Próximas** e, quando existem, **Anteriores**, além do progresso do dia. **Agenda** mostra apenas **Hoje** e **Próximas**. A classificação usa a data local do dispositivo e os horários de `scheduled_start_at`; cada secção é ordenada cronologicamente.
- O detalhe consulta a tarefa pelo ID e acrescenta `address`, `scheduled_end_at`, `started_at` e `completed_at` quando disponíveis.
- Ao tocar num cartão em qualquer separador, a app consulta o detalhe pelo ID. A lista é consultada novamente ao voltar do detalhe, ao regressar a **Tarefas** ou **Agenda**, e ao tocar em **Atualizar**.

## Estados e erros

Durante a consulta, a app mostra carregamento. Uma resposta `[]` apresenta **Sem tarefas**; a Agenda também apresenta um estado vazio se a lista só contiver tarefas anteriores. Em caso de erro de rede, servidor ou resposta inválida, apresenta uma mensagem e a opção **Tentar novamente**. Se o detalhe devolver `403` ou `404`, informa que a tarefa deixou de estar acessível e atualiza a lista. Uma resposta `401` limpa a sessão através do `AuthContext` e regressa ao login.

## Avisos ligados a tarefas — dependência pendente

O separador **Avisos** continua provisório. O mobile e a API consultados não definem um contrato de avisos que forneça um identificador de tarefa nem um endpoint de consulta de avisos. Por isso, ainda não é possível abrir um detalhe autorizado a partir de um aviso sem inventar o contrato. É necessário alinhar com o Emerson o formato e o ID de tarefa; depois, a app deve consultar `GET /api/tasks/{id}` ao abrir o aviso e tratar tarefa removida, acesso revogado, falha de rede e sessão expirada.

## Comunicar um impedimento

O prestador autenticado regista um impedimento na tarefa atualmente atribuída através de `POST /api/tasks/{id}/impediments`. O pedido envia `reason` (texto livre obrigatório, até 120 caracteres), `description` (opcional ou `null`, até 2000 caracteres) e `idempotency_key` (UUID). A app guarda o payload pendente e a chave no SecureStore para poder repetir exatamente o mesmo pedido depois de uma falha ambígua de rede ou timeout. O rascunho pendente é removido após sucesso e também ao terminar sessão ou ao expirar a sessão.

Uma criação nova devolve `201 Created`. Repetir o mesmo payload com a mesma chave devolve `200 OK` com o impedimento existente. Reutilizar a chave com conteúdo diferente devolve `409 Conflict`. Os restantes erros são tratados assim:

| HTTP | Significado |
| --- | --- |
| `401` | Sessão ausente/inválida ou conta inativa. |
| `403` | O utilizador não pode comunicar impedimentos ou já não está atribuído à tarefa. |
| `404` | A tarefa não existe. |
| `422` | Dados inválidos; a API devolve erros por campo. |

O envio bem-sucedido não altera o estado da tarefa nem a atribuição atual. Por enquanto, a API também aceita impedimentos em tarefas `completed` e `cancelled` se o prestador continuar atribuído; a regra definitiva continua pendente de decisão da equipa. Este fluxo não implementa upload de fotografias ou outras provas.

## Simulação da limpeza

Os botões de vídeo e conclusão no detalhe continuam identificados como simulação local. Não abrem a câmara, não enviam ficheiros e não alteram a tarefa na API. O estado e o progresso da lista refletem apenas dados devolvidos pela API.

## Validação

- `npx.cmd tsc --noEmit` passou. O projeto não define o script `npm run lint`.
- Foram validados com respostas simuladas: lista preenchida e vazia, detalhe, erros `401` e `404`, falha de rede, login e recuperação da identidade com `service_provider`, e guardar/restaurar/remover a sessão no SecureStore.
- O percurso visual num dispositivo real e a reatribuição de A para B com a API real ainda precisam de ser executados.
