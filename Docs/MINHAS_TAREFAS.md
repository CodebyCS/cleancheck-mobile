# Minhas Tarefas — integração com a API

A lista consulta `GET /api/tasks` e o detalhe consulta `GET /api/tasks/{task}` através de `authenticatedFetch`. O Bearer token vem da sessão; a API identifica o prestador e limita o acesso às tarefas atualmente atribuídas. Não há seletor de prestador nem dados fictícios neste percurso.

## Dados apresentados

- A lista recebe `id`, `property`, `type`, `scheduled_start_at` e `status`. Os cartões não mostram morada nem duração, porque esses dados não fazem parte da resposta da lista.
- A app agrupa as tarefas, segundo a data local do dispositivo, em **Hoje**, **Próximas** e **Anteriores**. O progresso do dia conta apenas tarefas com `status: completed` devolvido pela API.
- O detalhe consulta a tarefa pelo ID e acrescenta `address`, `scheduled_end_at`, `started_at` e `completed_at` quando disponíveis.
- A lista é consultada novamente ao voltar do detalhe, ao regressar ao separador **Tarefas** e ao tocar em **Atualizar**.

## Estados e erros

Durante a consulta, a app mostra carregamento. Uma resposta `[]` apresenta **Sem tarefas**. Em caso de erro de rede, servidor ou resposta inválida, apresenta uma mensagem e a opção **Tentar novamente**. Se o detalhe devolver `404`, informa que a tarefa deixou de estar disponível e atualiza a lista. Uma resposta `401` limpa a sessão através do `AuthContext` e regressa ao login.

## Simulação da limpeza

Os botões de vídeo e conclusão no detalhe continuam identificados como simulação local. Não abrem a câmara, não enviam ficheiros e não alteram a tarefa na API. O estado e o progresso da lista refletem apenas dados devolvidos pela API.

## Validação

- `npx.cmd tsc --noEmit` passou. O projeto não define o script `npm run lint`.
- Foram validados com respostas simuladas: lista preenchida e vazia, detalhe, erros `401` e `404`, falha de rede, login e recuperação da identidade com `service_provider`, e guardar/restaurar/remover a sessão no SecureStore.
- O percurso visual num dispositivo real e a reatribuição de A para B com a API real ainda precisam de ser executados.
