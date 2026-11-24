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

## Simulação da limpeza

Os botões de vídeo e conclusão no detalhe continuam identificados como simulação local. Não abrem a câmara, não enviam ficheiros e não alteram a tarefa na API. O estado e o progresso da lista refletem apenas dados devolvidos pela API.

## Validação

- `npx.cmd tsc --noEmit` passou. O projeto não define o script `npm run lint`.
- `npm test` não está disponível: o `package.json` não define o script `test` nem existe runner configurado neste checkout.
- O typecheck foi executado após a integração de avisos. O fluxo ainda precisa de validação manual num dispositivo real com avisos reais da API.
- Na validação anterior da agenda e autenticação, foram usados dados simulados para lista preenchida/vazia, detalhe, erros `401`/`404`, falha de rede, login, recuperação da identidade `service_provider` e ciclo de sessão no SecureStore. Estes resultados não substituem testes do novo fluxo de avisos.
- O percurso visual num dispositivo real e a reatribuição de A para B com a API real ainda precisam de ser executados.

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
