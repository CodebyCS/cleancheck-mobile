# Autenticação da aplicação mobile

## Contrato de login

A app envia `POST ${EXPO_PUBLIC_API_URL}/mobile/login` com os headers `Accept: application/json` e `Content-Type: application/json`.

```json
{
  "email": "prestador@example.test",
  "password": "senha-de-exemplo",
  "device_name": "Clean&Check Mobile"
}
```

`device_name` é opcional. A resposta de sucesso inclui `token`, `expires_at` e `user` (`id`, `name`, `email`, `role`).

A branch `develop` da API identifica o prestador com `role: service_provider`, mas uma instância local ainda pode devolver `role: prestador`. A app aceita ambos os valores no login, em `GET /api/user` e na sessão guardada no Expo SecureStore.

## Logout

A app envia `POST ${EXPO_PUBLIC_API_URL}/mobile/logout` com os headers `Accept: application/json` e `Authorization: Bearer <token>`.

O pedido é sempre tentado com o token atual. A limpeza local é executada no bloco `finally`: tanto numa resposta de sucesso da API como numa falha de rede, timeout ou erro devolvido pela API, o token e os dados de sessão são removidos do Expo SecureStore e do `AuthContext`. A app regressa, por isso, ao ecrã de login mesmo quando a revogação remota não é confirmada.

## Comportamento implementado

- O formulário recolhe email e palavra-passe, valida campos obrigatórios e o formato do email, e apresenta loading durante o pedido.
- O serviço valida a estrutura da resposta e a data de expiração antes de aceitar a sessão.
- Respostas `422` mapeiam `errors.email` e `errors.password` para os campos correspondentes. Credenciais inválidas também são mostradas no campo email conforme a resposta atual da API.
- Respostas `429` apresentam uma mensagem de bloqueio temporário.
- Falhas de rede, outros erros HTTP, URL não configurada e respostas inválidas têm mensagens próprias.
- `AuthContext` mantém token, utilizador e expiração no estado da aplicação. O login bem-sucedido guarda a sessão no Expo SecureStore e abre o ecrã existente.
- Ao iniciar a aplicação, `AuthContext` restaura a sessão guardada. Sessões expiradas ou dados inválidos são removidos; durante o restauro é apresentado um indicador de carregamento.
- `authenticatedFetch` adiciona `Accept: application/json` e `Authorization: Bearer <token>` aos pedidos autenticados.
- Antes de um pedido autenticado, uma sessão expirada é removida e o utilizador regressa ao login. Uma resposta HTTP `401` também limpa a sessão guardada e provoca o regresso ao login.
- Após autenticação, a navegação provisória disponibiliza os separadores **Tarefas**, **Agenda**, **Avisos** e **Perfil**.
- A ação de logout está disponível no separador **Perfil**. O pedido de revogação é enviado antes da limpeza local; a limpeza e o regresso ao ecrã de login ocorrem sempre, mesmo que esse pedido falhe.
- O endereço base é configurado por `EXPO_PUBLIC_API_URL` no `.env.local` da pasta `mobile`; reinicia o Expo depois de o alterar.

## Limitações e trabalho pendente

A sessão é persistida localmente com Expo SecureStore, mas a renovação do token ainda não está implementada. Quando a sessão expira ou a API devolve `401`, a aplicação remove a sessão local e exige um novo login.

A API atual devolve o campo `role`, mas o endpoint de login não restringe o acesso aos perfis de prestador (`service_provider` ou `prestador`). Confirmar com a equipa se a API deverá impor essa regra; uma validação apenas no cliente não constitui controlo de acesso seguro.

Os separadores **Agenda**, **Avisos** e **Perfil** fazem parte da navegação provisória. A presença dos separadores não confirma integração dessas áreas com a API.

## Validação

- `npm exec tsc -- --noEmit`: passou.
- O QA validou com test doubles o login `200`, erros `422`/`429`, falha de rede e operações do SecureStore. O envio Bearer, restauro, expiração, fluxo `401` e a limpeza local no logout, incluindo quando a API falha, foram inspecionados.
- O projeto não define script `lint`; o serviço não foi testado contra a API real nem num dispositivo nesta validação.
