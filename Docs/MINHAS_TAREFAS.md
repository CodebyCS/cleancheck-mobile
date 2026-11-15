# Minhas Tarefas e Agenda — integração com a API

A lista consulta `GET /api/my/tasks` (seguindo a paginação da API) e o detalhe consulta `GET /api/my/tasks/{id}` através de `authenticatedFetch`. O Bearer token vem da sessão; a API identifica o prestador e limita o acesso às tarefas atualmente atribuídas. Não há seletor de prestador nem dados fictícios neste percurso.

## Dados apresentados

- A lista recebe `id`, `property`, `type`, `scheduled_start_at` e `status`. Os cartões não mostram morada nem duração, porque esses dados não fazem parte da resposta da lista.
- Os separadores **Tarefas** e **Agenda** usam a mesma lista autenticada. **Tarefas** mostra **Hoje**, **Próximas** e, quando existem, **Anteriores**, além do progresso do dia. **Agenda** mostra apenas **Hoje** e **Próximas**. A classificação usa a data local do dispositivo e os horários de `scheduled_start_at`; cada secção é ordenada cronologicamente.
- O detalhe consulta a tarefa pelo ID e acrescenta `address`, `scheduled_end_at`, `started_at`, `completed_at` e `provider_notes` quando disponíveis. As ações de iniciar, guardar notas e concluir usam os endpoints de prestador da API.
- Ao tocar num cartão em qualquer separador, a app consulta o detalhe pelo ID. A lista é consultada novamente ao voltar do detalhe, ao regressar a **Tarefas** ou **Agenda**, e ao tocar em **Atualizar**.

## Estados e erros

Durante a consulta, a app mostra carregamento. Uma resposta `[]` apresenta **Sem tarefas**; a Agenda também apresenta um estado vazio se a lista só contiver tarefas anteriores. Em caso de erro de rede, servidor ou resposta inválida, apresenta uma mensagem e a opção **Tentar novamente**. Se o detalhe devolver `403` ou `404`, informa que a tarefa deixou de estar acessível e atualiza a lista. Uma resposta `401` limpa a sessão através do `AuthContext` e regressa ao login.

## Avisos ligados a tarefas

O separador **Avisos** consulta `GET /api/booking-notices` com `authenticatedFetch`. A API devolve uma resposta paginada com os avisos em `data`; cada item inclui `id`, `type`, `read`, `readAt`, `notifiedAt`, `booking`, `property` e `task`. A relação `task` pode ser `null`; quando existe, contém `id` e `available`.

- A lista mostra os dados recebidos pela API e os estados de carregamento, vazio, erro e nova tentativa. Se uma atualização falhar com a lista já carregada, a lista mantém-se e o erro aparece por cima. Puxar o ecrã para baixo ou tocar em **Atualizar** volta a carregar a primeira página.
- Os avisos por ler têm contorno azul e a etiqueta **NOVO**; o topo mostra o total por ler (`meta.unreadCount`). As datas da reserva são as do momento do aviso, apresentadas como `dd/mm/aaaa`.
- **Abrir tarefa atual** marca o aviso como lido com `PATCH /api/booking-notices/{id}/read` e só depois abre a tarefa, usando o `task.available` devolvido nessa resposta. Um aviso sem tarefa para abrir tem a ação **Marcar como lido**. Repetir a leitura não altera nada: a API mantém o primeiro `readAt`, e a app não volta a pedir para avisos já lidos.
- A resposta é paginada (20 por página). **Ver mais avisos** carrega a página seguinte; avisos que já estão no ecrã não se repetem, mesmo que tenham subido para o topo entretanto.
- Um aviso com `task: null` permanece informativo e não tem ação para abrir tarefa. Se `task.available` for `false`, a tarefa também não abre e o aviso continua visível.
- Se `task.available` for `true`, abrir o aviso consulta o detalhe atual em `GET /api/my/tasks/{id}`. A resposta fica dentro de `data`; o campo `property_address` é adaptado ao campo `address` esperado pelo ecrã. Os dados históricos do aviso não são usados como detalhe atual.
- Se a tarefa tiver sido removida ou reatribuída entre a listagem e a abertura, o endpoint de detalhe responde `404`; a app informa que a tarefa já não está disponível. Ao voltar, recarrega a lista de avisos.
- Um `401` é tratado pelo `AuthContext`, que limpa a sessão e regressa ao login. Falhas de rede, configuração, permissões ou resposta inválida mostram erro e permitem tentar novamente.
- A API também disponibiliza `GET /api/booking-notices/{id}`; o mobile não usa essa operação, porque a lista já traz todos os campos.

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

## Validação

- `npm test` (na pasta `mobile/`) executa os testes do serviço de impedimentos; o projeto não define `npm run lint`.
- Os testes automatizados usam respostas fictícias da API e cobrem criação, repetição idempotente, validação, acesso negado, tarefa inexistente, sessão expirada, falha de rede e armazenamento do envio pendente.
- A validação manual num dispositivo com avisos reais e o percurso completo de sessão expirada ainda precisam de confirmação.
