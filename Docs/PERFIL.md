# Perfil da pessoa autenticada

## Contrato

A app envia `GET ${EXPO_PUBLIC_API_URL}/profile` com os headers `Accept: application/json` e `Authorization: Bearer <token>`, através do `authenticatedFetch`.

O pedido não inclui nenhum identificador. A API obtém o prestador a partir do token da sessão, por isso cada conta só consegue consultar o seu próprio perfil.

A resposta de sucesso (`200`) devolve em `data`:

| Campo | Descrição |
| --- | --- |
| `id` | Identificador do prestador |
| `name`, `email` | Dados da conta |
| `phone` | Telefone |
| `address`, `postal_code`, `city` | Morada (podem ser `null`) |
| `photo_url` | Link assinado e temporário da fotografia, ou `null` |
| `is_active` | Estado da conta |

## Comportamento implementado

- O separador **Perfil** carrega os dados da API ao abrir, em vez de usar apenas os dados guardados na sessão.
- É apresentada a fotografia. Sem fotografia, ou se o link falhar, são apresentadas as iniciais do nome.
- São apresentados nome, e-mail, telefone e morada (morada, código postal e localidade). Sem morada, aparece "Não indicada".
- Durante o pedido é apresentado um indicador de carregamento.
- Falhas de rede, timeout (10 segundos), erros da API e respostas com formato inválido mostram uma mensagem e o botão **Tentar novamente**.
- Uma resposta `401` limpa a sessão local através do `authenticatedFetch` e a aplicação regressa ao login.
- Uma resposta `404` indica que a conta não tem registo de prestador.
- Puxar o ecrã para baixo volta a carregar o perfil. O link da fotografia expira ao fim de 10 minutos, por isso a atualização gera um link novo.
- O logout mantém o comportamento descrito em [LOGIN.md](./LOGIN.md).
- O botão **Ensaio de câmara** abre o ensaio de fotografia e vídeo descrito em [ENSAIO_CAMARA.md](./ENSAIO_CAMARA.md), dentro do separador Perfil.

## Perfis aceites

A API identifica os prestadores com o perfil `service_provider`. A validação do login e da sessão guardada aceita `admin`, `supervisor` e `service_provider` (`AuthUser` e `isAuthUser` em `src/services/auth.ts`). Sessões guardadas com o perfil antigo `prestador` são removidas e é pedido um novo login.

## Verificação com duas contas

Pré-requisitos:

- API em execução com `php artisan migrate:fresh --seed`.
- `.env.local` da pasta `mobile` com `EXPO_PUBLIC_API_URL` a apontar para a API.
- Opcional: enviar uma fotografia para um dos prestadores com `POST /api/service-providers/{id}/photo` (conta `admin`).

Passos:

1. Iniciar sessão com `prestador1@example.test` e abrir o separador **Perfil**.
2. Confirmar que o nome, o e-mail e a fotografia (ou as iniciais) correspondem a esta conta.
3. Terminar sessão.
4. Iniciar sessão com `prestador2@example.test` e abrir o separador **Perfil**.
5. Confirmar que são apresentados os dados da segunda conta e nenhum dado da primeira.
6. Desligar a API, puxar o ecrã para baixo e confirmar a mensagem de erro e o botão **Tentar novamente**.
7. Voltar a ligar a API e carregar em **Tentar novamente**.

Esta lista descreve o procedimento de teste. Não constitui uma declaração de que os testes passaram.

## Revisão de usabilidade (Sprint 4)

Revisão do Perfil em diferentes dimensões, com teclado e com textos extensos, usando dados fictícios.

### Como foi feito

- Ecrãs `ProfileScreen` e `CameraTrialScreen` executados no browser (React Native Web), com a API e a câmara simuladas.
- Larguras de 320 px (telemóveis pequenos) e 375 px (iPhone SE).
- Conta fictícia com textos longos: nome com 65 caracteres, e-mail com 80, telefone com dois números e morada com mais de 90 caracteres.

### Resultados

| # | Cenário | Largura | Resultado |
|---|---|---|---|
| 1 | Perfil com nome, e-mail, telefone e morada longos | 320 px | Os textos partem dentro do cartão; sem deslocamento horizontal |
| 2 | Perfil com dados curtos | 375 px | Sem alterações |
| 3 | Sem fotografia | 320 e 375 px | Iniciais no lugar da fotografia |
| 4 | Sem morada | 375 px | "Não indicada" a cinzento |
| 5 | Erro de rede ao carregar | 375 px | Mensagem e botão **Tentar novamente** |
| 6 | Abrir o ensaio de câmara a partir do Perfil e voltar | 375 px | Abre no mesmo separador; **Voltar ao perfil** regressa |
| 7 | Ensaio de câmara num ecrã pequeno | 320 px | Botões e cartões cabem no ecrã; sem deslocamento horizontal |
| 8 | Campo "Aparelho e rede" do ensaio | 375 px | Recebe foco e texto; limite de 120 caracteres |

Não foram encontrados defeitos que impeçam o percurso.

### Confirmação em aparelho real

O teclado do sistema, o tamanho de letra do sistema e o leitor de ecrã só se confirmam num telemóvel.

| Aparelho | Sistema | Perfil com textos longos | Tamanho de letra aumentado | Teclado no ensaio | Quem confirmou |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

## Limitações

- A fotografia só pode ser alterada por administradores e supervisores; o perfil mobile é apenas de consulta.
- O projeto mobile não tem testes automáticos; a verificação é manual e com `npm exec tsc -- --noEmit`.
- A revisão de usabilidade no browser não substitui a confirmação em aparelho real (tabela acima).
