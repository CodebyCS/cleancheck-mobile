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

## Comportamento implementado

- O formulário recolhe email e palavra-passe, valida campos obrigatórios e o formato do email, e apresenta loading durante o pedido.
- O serviço valida a estrutura da resposta e a data de expiração antes de aceitar a sessão.
- Respostas `422` mapeiam `errors.email` e `errors.password` para os campos correspondentes. Credenciais inválidas também são mostradas no campo email conforme a resposta atual da API.
- Respostas `429` apresentam uma mensagem de bloqueio temporário.
- Falhas de rede, outros erros HTTP, URL não configurada e respostas inválidas têm mensagens próprias.
- `AuthContext` mantém token, utilizador e expiração em memória, sem apresentar o token na interface. O login bem-sucedido abre o ecrã existente.
- O endereço base é configurado por `EXPO_PUBLIC_API_URL` no `.env.local` da pasta `mobile`; reinicia o Expo depois de o alterar.

## Limitações e trabalho pendente

Por decisão do utilizador, não foi adicionada uma dependência de armazenamento seguro. `AuthTokenStorage` permanece apenas como contrato; o token não persiste nem é restaurado após fechar/reiniciar a app. Logout, renovação de token e sessão persistente também não estão implementados.

A API atual devolve o campo `role`, mas o endpoint de login não restringe o acesso ao papel `prestador`. Confirmar com a equipa se a API deverá impor essa regra; uma validação apenas no cliente não constitui controlo de acesso seguro.

## Validação

- `npm exec tsc -- --noEmit`: passou.
- O QA validou o serviço com test doubles para sucesso `200`, validação `422`, limite `429` e falha de rede.
- O projeto não define script `lint`; o serviço não foi testado contra a API real nem num dispositivo nesta validação.