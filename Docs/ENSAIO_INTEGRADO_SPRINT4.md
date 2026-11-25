# Sprint 4 — demonstração integrada na build Android (issue #18)

Data: 19/11/2026. Execução no Android Emulator `Medium_Phone_API_37.0:5554`,
Android 37. Build EAS `preview-local` instalada pelo APK da
[build 280ce9ea](https://expo.dev/accounts/pedroatec/projects/cleancheck-mobile/builds/280ce9ea-3354-4878-b521-f70c19fe0b8b).
A app foi aberta pelo ícone, sem Expo Go nem Metro.

Ambiente: API real do checkout local em `http://10.0.2.2:8000/api`, MySQL do
XAMPP. A base `cleancheck` contém migrations e seeders de demonstração. Conta
fictícia `prestador1@example.test`; a palavra-passe de teste é definida no
`DemoUserSeeder` da API e não deve ser usada fora do ambiente local.

## Dados preparados

- O `TaskSeeder` atribuiu duas tarefas ao prestador fictício: uma em Hoje e outra
  em Próximas.
- Foi criado no MySQL local o aviso de reserva `booking_updated`, ID 1, para o
  mesmo utilizador e a tarefa 1. O aviso guarda `booking_id` e `task_id`, tem
  datas de reserva e começou por ler `false`. Este registo foi preparado apenas
  para o ensaio; não alterámos a API nem apresentámos um mock como dado real.

## Passos e resultados observados

1. Abrir a app instalada e usar o diagnóstico: `GET /api/health` devolveu
   `CleanCheck: ok`, HTTP 200.
2. Iniciar sessão com a conta fictícia: apareceu “Olá, Prestador Um”.
3. Abrir Minhas Tarefas: apareceu uma tarefa em Hoje e outra em Próximas.
4. Abrir o detalhe: mostrou o estado pendente, morada, horário, prazo e tipo
   recebidos da API.
5. Abrir Agenda: mostrou as duas tarefas nas secções Hoje e Próximas.
6. Abrir Avisos e atualizar: o aviso “Reserva alterada” apareceu com propriedade,
   datas e ação “Abrir tarefa atual”.
7. Tocar na ação: abriu o detalhe autorizado da tarefa com os dados atuais da
   API, incluindo “Limpeza após checkout”.

## Limites deste ensaio

- Testámos o estado vazio de Avisos antes de criar o registo e o estado com um
  aviso depois. Não preparámos casos `task: null` ou `task.available: false`
  nesta execução; esses comportamentos continuam a precisar de validação com
  dados apropriados se forem exigidos para a demonstração completa.
- Este ensaio usou o emulador e a API local do autor. A instalação por outro
  colega num Android físico e a ligação à API partilhada pertencem ao ponto 2
  da issue #17 e ao ponto 3 da issue #18.
- Câmara, envio de vídeo e permissões recusadas pertencem ao ponto 2 da
  issue #18 e não foram testados aqui.
