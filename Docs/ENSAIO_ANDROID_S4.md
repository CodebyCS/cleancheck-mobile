# Ensaio integrado Android — Sprint 4

Este guião regista o percurso da issue #18 numa build Android instalável: autenticação, tarefas, agenda, avisos e o ensaio de câmara/envio. Deve ser executado contra a API de teste real. Não usar respostas mock como prova de integração.

## Preparação

1. Obter o link da build interna `preview` e confirmar a versão/commit da build antes de iniciar. A build deve abrir sem Metro.
2. Confirmar com a equipa que as variáveis `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_HEALTH_URL` da build apontam para o ambiente de teste acessível pelo aparelho. Não usar `localhost` nem incluir segredos nessas variáveis.
3. Preparar no ambiente de teste uma conta ativa de prestador, pelo menos uma tarefa atualmente atribuída a essa conta e avisos de teste. Usar os seeders e os fluxos de API documentados pela equipa; não criar fixtures apenas no cliente.
4. As contas fictícias documentadas pela API incluem `prestador1@example.test` e `prestador2@example.test`. Obter a palavra-passe de teste pelo canal interno da equipa/seeder. Não guardar palavras-passe, tokens ou dados pessoais neste ficheiro, no PR ou nas capturas.
5. Preparar uma fotografia e um vídeo curtos sem pessoas, moradas ou outros dados pessoais. Para o endpoint experimental de ensaio, respeitar os limites da API: fotografia até 10 MB e vídeo até 50 MB. O envio experimental não fica associado a uma tarefa nem conta como prova de limpeza.
6. Para o teste de avisos, assegurar dados de API para estes casos: aviso com tarefa disponível; aviso sem tarefa associada ou com tarefa indisponível. Se não existirem, registar a dependência e não fabricar avisos no mobile.

### Registo dos dados fictícios preparados

Preencher com identificadores do ambiente de teste antes da demonstração. A tabela é um registo, não afirma que essas tarefas/avisos já existam.

| Dado de teste | Valor/ID no ambiente de teste | Preparado por |
|---|---|---|
| Conta fictícia de prestador (`prestador1@example.test` ou `prestador2@example.test`) | | |
| Tarefa atribuída para abrir no detalhe | | |
| Aviso com tarefa disponível | | |
| Aviso sem tarefa ou com acesso removido | | |
| Fotografia de teste (sem dados pessoais, até 10 MB) | | |
| Vídeo de teste (curto, sem dados pessoais, até 50 MB) | | |

## Percurso de teste

### 1. Instalação e login

- Instalar o APK no Android sem iniciar Metro e abrir a aplicação.
- Confirmar que o ecrã de diagnóstico consegue contactar `/api/health`.
- Iniciar sessão com a conta fictícia de prestador preparada.
- Fechar e reabrir a app; confirmar que a sessão é restaurada. Terminar sessão no fim do teste.
- Registar erros de ligação, autenticação ou restauro sem incluir tokens ou passwords.

### 2. Tarefas e agenda

- Abrir **Tarefas** e confirmar que a lista corresponde às tarefas atribuídas à conta de teste.
- Abrir uma tarefa e confirmar que o detalhe é obtido da API.
- Abrir **Agenda** e verificar as secções **Hoje** e **Próximas** e a ordenação dos horários.
- Atualizar a lista manualmente e regressar do detalhe; confirmar que a lista volta a consultar a API.
- Se o ambiente tiver uma conta sem tarefas atribuídas, confirmar o estado vazio. Caso contrário, registar como não testado; não simular uma resposta vazia na demonstração real.

### 3. Avisos

- Abrir **Avisos**, atualizar a lista e confirmar que os conteúdos vêm de `GET /api/booking-notices`.
- Para um aviso com `task.available: true`, abrir a tarefa e confirmar que a app consulta o detalhe autorizado atual.
- Confirmar que um aviso sem tarefa ou com tarefa indisponível continua visível e não abre um detalhe não autorizado.
- Registar separadamente os casos não disponíveis no ambiente de teste.

### 4. Câmara, galeria e permissões

- Em **Perfil → Ensaio de câmara**, conceder acesso à câmara e tirar uma fotografia; enviar e confirmar a resposta da API.
- Gravar um vídeo curto e enviá-lo; confirmar a resposta da API.
- Escolher um ficheiro de teste da galeria e enviar.
- Repor a permissão da câmara nas definições Android, negar o acesso e tentar abrir a câmara. Confirmar que a app apresenta uma mensagem clara e continua utilizável. Repetir para acesso à galeria se o sistema apresentar essa permissão.
- O endpoint `POST /api/evidence-trials` é experimental: guarda o ficheiro fora das tarefas e não altera o estado de nenhuma tarefa. Não o descrever como upload de prova real.

## Registo dos resultados

Preencher uma linha por execução. Usar apenas identificadores de teste e descrições sem dados pessoais.

| Execução | Tester | Aparelho / Android | Build (versão/commit) | Ambiente API | Login e sessão | Tarefas/agenda | Avisos | Câmara/envio | Permissão recusada | Erros/limitações |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | Teste | | | | | | |
| 2 (outro colega) | | | | Teste | | | | | | |

Anexar capturas/logs apenas depois de remover dados pessoais, passwords, tokens e endereços privados. Registar cada cenário como **Passou**, **Falhou** ou **Não testado**, com uma nota curta.

## Limitações conhecidas

- O ensaio de câmara usa o endpoint experimental `/api/evidence-trials`; o ficheiro não fica associado a uma tarefa. Não valida o futuro fluxo completo de provas.
- O limite do vídeo nesse endpoint de ensaio é 50 MB. O limite acordado para futuros vídeos inicial/final associados a tarefas é 100 MB; esse limite não deve ser usado para concluir que a API experimental aceita ficheiros de 100 MB.
- A validade do percurso depende da disponibilidade da API de teste, dos dados preparados e da configuração do ambiente na build.
- Não marcar validação em Android nem reprodução por outro colega até as execuções estarem registadas nesta tabela ou no resultado do PR.
