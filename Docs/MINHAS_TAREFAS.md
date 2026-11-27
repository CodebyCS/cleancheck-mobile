# Minhas Tarefas e Agenda — integração com a API

A lista consulta `GET /api/tasks` e o detalhe consulta `GET /api/tasks/{task}` através de `authenticatedFetch`. O Bearer token vem da sessão; a API identifica o prestador e limita o acesso às tarefas atualmente atribuídas. Não há seletor de prestador nem dados fictícios neste percurso.

## Dados apresentados

- A lista recebe `id`, `property`, `type`, `scheduled_start_at` e `status`. Os cartões não mostram morada nem duração, porque esses dados não fazem parte da resposta da lista.
- Os separadores **Tarefas** e **Agenda** usam a mesma lista autenticada. **Tarefas** mostra **Hoje**, **Próximas** e, quando existem, **Anteriores**, além do progresso do dia. **Agenda** mostra apenas **Hoje** e **Próximas**. A classificação usa a data local do dispositivo e os horários de `scheduled_start_at`; cada secção é ordenada cronologicamente.
- O detalhe consulta a tarefa pelo ID e acrescenta `address`, `scheduled_end_at`, `started_at` e `completed_at` quando disponíveis.
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

## Execução, checklist e evidências (Sprint 6)

No detalhe de uma tarefa em curso, **Checklist e provas** carrega a checklist versionada da tarefa com `GET /api/my/tasks/{task}/checklist`. Mostra os itens, versão, obrigatoriedade e progresso devolvidos pela API. Cada marcação/desmarcação é guardada imediatamente com `PATCH /api/my/tasks/{task}/checklist/items/{itemId}`; os itens só são editáveis enquanto a tarefa está em curso. Uma resposta `data: null` é apresentada como ausência de checklist configurada. O fluxo está disponível para tarefas `checkout_cleaning` e `checkin_inspection`.

Fotografias/vídeos podem ser capturados pela câmara ou selecionados na galeria e enviados para `POST /api/my/tasks/{task}/evidence`. Os IDs devolvidos pela API são mantidos internamente para associação à execução/vistoria e não são apresentados ao prestador; a confirmação só aparece depois da resposta `201`. Formatos e limites de upload seguem a validação atual da API (foto até 10 MB; vídeo até 50 MB); a app limita vídeos a 60 segundos, mas a API de produção não valida duração.

As respostas da checklist versionada são persistidas item a item pela API e não são duplicadas em `responses[]` da execução. As observações continuam a ser enviadas em `POST /api/my/tasks/{task}/executions`, limitadas a 5000 caracteres. A prova anterior é associada à execução; a prova posterior, em tarefa `checkout_cleaning`, é associada a `POST /api/my/tasks/{task}/checkout-inspection` após a hora prevista de check-out.

Execuções e vistorias de saída guardam a chave e o payload pendentes no SecureStore; retries repetem os mesmos dados e a mesma chave. A sessão/AuthContext limpa os pendentes ao terminar sessão. O upload binário não aceita chave idempotente; se a resposta se perder, o resultado pode ser desconhecido. A app não afirma sucesso e avisa para não repetir imediatamente, mas não consegue reconciliar automaticamente um ficheiro cujo ID não foi recebido. Ver [contrato mobile de evidências](./contratos/upload-videos.md) para limites, respostas, erros e passos de validação.

A conclusão da tarefa continua a ser uma operação separada; guardar checklist ou vistoria não altera o estado da tarefa.

## Validação da recuperação de envios pendentes (27/11/2026)

O fluxo de execução e vistoria guarda payload e chave de idempotência no SecureStore. Se a consulta de confirmação falhar, mantém ambos para repetir o mesmo pedido; só liberta o envio pendente quando a API confirma a mesma chave. Enquanto o resultado for desconhecido, não permite iniciar outro envio. Uma confirmação de sucesso limpa o pendente.

Verificações automatizadas concluídas:

- `npm.cmd test` — 29 testes passaram.
- `npx.cmd tsc --noEmit` — passou.
- `git diff --check` — passou.

### Demonstração integrada — issue #18 (24/11/2026)

Verificações feitas contra a API alojada `https://api.cleancheck.atec-porto.eu/api`:

- `GET /api/health`: HTTP 200 (`CleanCheck`, estado `ok`).
- Login mobile da conta fictícia `evertonduarte@cleancheck.test` (`service_provider`): sucesso.
- `GET /my/tasks`: devolveu as tarefas #3 (22/11/2026) e #1 (25/11/2026). Não havia tarefa agendada para 24/11/2026; existia apenas uma tarefa passada e uma próxima.
- `GET /my/tasks/1` e `GET /my/tasks/3`: HTTP 200. Os detalhes atuais foram devolvidos pela API.
- `GET /booking-notices`: lista vazia (`data: []`, `meta.unreadCount: 0`). Não foi possível demonstrar a abertura de uma tarefa a partir de um aviso real.
- A build instalada no emulador estava aberta no ecrã de ensaio de ficheiros e mostrava “A tarefa já não está disponível para a tua conta”. Não confirmei o ID do binário instalado nem completei na interface o percurso de login, tarefas, agenda e avisos.

Foi encontrada a tarefa fictícia #4, pendente e sem prestador, associada à reserva de teste `issue18-codex-20261123@cleancheck.test`. A tentativa de a atribuir à conta de teste através de `PATCH /api/tasks/4` devolveu uma página HTML de bloqueio ModSecurity (`403`), em vez da resposta JSON da API. Uma consulta posterior confirmou que a tarefa continuava sem prestador; não foram alterados dados. Assim, não foi possível preparar a tarefa de hoje nem gerar o aviso associado.

**Estado:** o primeiro ponto da issue #18 continua pendente. Para o concluir, é necessário que a equipa de alojamento permita a operação administrativa de atribuição no ambiente de teste (ou prepare os dados), e depois repetir a demonstração na build instalada. Também é preciso confirmar o ID da build efetivamente instalada e validar que a conta usada na app é a conta de teste indicada acima. Nenhuma palavra-passe foi registada.

## Reconexão e acesso atual

- Quando a app volta ao primeiro plano (telemóvel desbloqueado, regresso de outra app), a lista de tarefas e a de avisos voltam a ser pedidas à API, sem indicador de carregamento. Se a rede ainda não voltou, a lista anterior mantém-se com a mensagem de erro.
- Uma tarefa aberta também é consultada outra vez nesse momento.
- Se a API responder `404` a uma tarefa aberta (ao voltar à app, ao iniciar, ao guardar notas ou ao concluir), o detalhe é substituído por "Esta tarefa já não está atribuída à tua conta…" e só permite voltar à lista. Os dados da tarefa deixam de ser mostrados.
- Sessão expirada (`401`) em qualquer destes pedidos: o `AuthContext` limpa a sessão e a app regressa ao login.
- A reconexão usa o `AppState` do React Native (sem dependências novas). Mudanças de rede com a app aberta não são detetadas; nesse caso usar **Atualizar** ou puxar o ecrã.

### Registo do ensaio no dispositivo

| # | Caso | Como provocar | Esperado | Aparelho | Resultado |
|---|---|---|---|---|---|
| 1 | Aviso novo com a app em segundo plano | App em **Avisos** → bloquear o telemóvel → no web, ajustar a data de uma reserva desta pessoa → desbloquear | O aviso aparece sem puxar o ecrã | | |
| 2 | Reatribuição com o detalhe aberto | Abrir uma tarefa → bloquear → no web, reatribuir a outro prestador → desbloquear | Mensagem "já não está atribuída" sem dados da tarefa | | |
| 3 | Reatribuição sem sair da app | Abrir uma tarefa pendente → no web, reatribuir → **Iniciar tarefa** | A mesma mensagem; a tarefa não é iniciada | | |
| 4 | Falha seguida de recuperação | Modo de avião → **Atualizar** em Avisos → desligar o modo de avião → mudar de app e voltar | Erro com a lista anterior; depois atualiza sozinho e o erro desaparece | | |
| 5 | Sessão expirada | Apagar os tokens na API (ver abaixo) → voltar à app | Regressa ao login com a mensagem de sessão expirada | | |

Ensaio feito por ______ em __/__/2026. Reproduzido por ______ em __/__/2026.
