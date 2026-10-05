# Login da aplicação mobile

## Objetivo

Preparar o ecrã e a estrutura de autenticação do Prestador enquanto o contrato da API não está definido. A implementação atual permite validar a interface e o fluxo provisório sem efetuar autenticação real.

## Implementado

- Ecrã de login com campos de telemóvel e PIN e teclado numérico.
- Validação dos campos obrigatórios e estados visuais para campos vazios, preenchidos e com erro.
- Estado de carregamento no botão **ENTRAR** durante o envio.
- Mensagens de erro mock para credenciais inválidas e falha de rede.
- Navegação provisória para o ecrã inicial após um login mock bem-sucedido.
- Acesso ao ecrã de diagnóstico da API a partir do login.
- Serviço de autenticação mock, preparado para futura integração com a API.
- Interface para armazenamento seguro do token, sem persistência de dados nesta fase.

## Como testar o mock

- **Sucesso:** preencher telemóvel e PIN com valores normais.
- **Credenciais inválidas:** usar o telemóvel `000000000`.
- **Falha de rede:** usar o telemóvel `999999999`.

## Validação

- Verificação TypeScript concluída com sucesso.
- `npm run lint` não foi executado porque o projeto não possui o respetivo script.
- `npm run build` não foi executado porque o projeto não possui o respetivo script.

## Pendências com o Carlos

- Endpoint e método HTTP do login.
- Payload e formato dos campos enviados.
- Estrutura da resposta, incluindo token e utilizador.
- Códigos HTTP e formato dos erros.
- Validade e renovação do token.
- Confirmação de que o utilizador autenticado tem o papel de Prestador.
- Estratégia definitiva para armazenamento e recuperação da sessão.
- Funcionamento do logout.

## Fora do âmbito atual

O login real, a gestão definitiva da sessão, o logout e os perfis de utilizador **não estão implementados**. Estas funcionalidades só devem ser concluídas depois de o contrato da API ser definido com o Carlos.
