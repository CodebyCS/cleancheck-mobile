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

- A lista mostra os dados recebidos pela API e os estados de carregamento, vazio, erro e nova tentativa. A interface mostra o estado de leitura devolvido pela API; abrir o aviso não o marca como lido.
- A resposta é paginada (20 por página); esta versão apresenta a página devolvida por omissão e ainda não disponibiliza navegação para páginas seguintes.
- Um aviso com `task: null` permanece informativo e não tem ação para abrir tarefa. Se `task.available` for `false`, a tarefa também não abre e o aviso continua visível.
- Se `task.available` for `true`, abrir o aviso consulta o detalhe atual em `GET /api/my/tasks/{id}`. A resposta fica dentro de `data`; o campo `property_address` é adaptado ao campo `address` esperado pelo ecrã. Os dados históricos do aviso não são usados como detalhe atual.
- Se a tarefa tiver sido removida ou reatribuída entre a listagem e a abertura, o endpoint de detalhe responde `404`; a app informa que a tarefa já não está disponível. Ao voltar, recarrega a lista de avisos.
- Um `401` é tratado pelo `AuthContext`, que limpa a sessão e regressa ao login. Falhas de rede, configuração, permissões ou resposta inválida mostram erro e permitem tentar novamente.
- A API também disponibiliza `GET /api/booking-notices/{id}` e `PATCH /api/booking-notices/{id}/read`; o mobile não usa essas operações neste fluxo.

## Simulação da limpeza

Os botões de vídeo e conclusão no detalhe continuam identificados como simulação local. Não abrem a câmara, não enviam ficheiros e não alteram a tarefa na API. O estado e o progresso da lista refletem apenas dados devolvidos pela API.

## Validação

- `npx.cmd tsc --noEmit` passou. O projeto não define o script `npm run lint`.
- `npm test` não está disponível: o `package.json` não define o script `test` nem existe runner configurado neste checkout.
- O typecheck foi executado após a integração de avisos. O fluxo ainda precisa de validação manual num dispositivo real com avisos reais da API.
- Na validação anterior da agenda e autenticação, foram usados dados simulados para lista preenchida/vazia, detalhe, erros `401`/`404`, falha de rede, login, recuperação da identidade `service_provider` e ciclo de sessão no SecureStore. Estes resultados não substituem testes do novo fluxo de avisos.
- O percurso visual num dispositivo real e a reatribuição de A para B com a API real ainda precisam de ser executados.
