# CleanCheck Mobile

Aplicação mobile do projeto CleanCheck, uma aplicação de apoio à gestão de serviços de limpeza e acompanhamento de prestadores em alojamentos.

Este repositório destina-se à aplicação em React Native com TypeScript, que utiliza a API Laravel do projeto.

## Estado atual

Projeto em fase inicial de configuração e desenvolvimento.

A aplicação React Native com TypeScript e Expo encontra-se na pasta mobile. Estão implementados o diagnóstico através de /api/health, o login por token, o armazenamento da sessão no SecureStore, a confirmação da identidade através de /api/user e o logout. As tarefas continuam a utilizar dados fictícios. A implementação e os resultados dos testes devem ser distinguidos: a validação completa da integração num dispositivo deve ser registada após execução.

## Tecnologias

- React Native
- TypeScript
- Expo
- Node.js
- npm

As dependências encontram-se em `mobile/package.json` e as versões resolvidas em `mobile/package-lock.json`.

### Versões confirmadas no ambiente local

| Ferramenta | Versão |
|---|---|
| Node.js | 26.8.2 |
| npm | 11.19.1 |
| Expo CLI | 57.0.27 |
| Expo (pacote / SDK 57) | 57.0.25 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| TypeScript | 6.0.3 |

Estas versões foram confirmadas através de `node --version`, `npm --version`, `npx expo --version` e `npm ls expo react react-native typescript --depth=0`. O comando `npx expo --version` apresenta a versão da CLI. A versão de Node.js usada no teste é um registo do ambiente local; a versão comum da equipa ainda deve ser definida.

## Requisitos

Antes de começar, instala:

- Git
- Node.js numa versão LTS compatível com o SDK Expo do projeto
- npm, incluído na instalação do Node.js
- Expo Go num telemóvel compatível com o SDK do projeto, ou um emulador Android configurado através do Android Studio

A API Laravel deve estar em execução para utilizar as funcionalidades que dependem do backend. As versões utilizadas neste teste estão registadas acima.

O simulador iOS exige macOS e Xcode. No Windows, é possível testar num iPhone físico através do Expo Go quando as funcionalidades forem compatíveis. Módulos nativos não incluídos no Expo Go exigem um development build.

## Instalação local

### 1. Clonar o repositório

```bash
git clone https://github.com/CodebyCS/cleancheck-mobile
cd cleancheck-mobile
```

### 2. Instalar as dependências

```bash
cd mobile
npm ci
```

Este comando utiliza o `package-lock.json` versionado. Na preparação inicial do projeto, executar `npm install` para gerar esse ficheiro, caso ainda não exista.

### 3. Configurar a ligação à API

Dentro da pasta `mobile`, copia o modelo de ambiente:

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

No Linux ou macOS:

```bash
cp .env.example .env.local
```

Edita `.env.local` e substitui `IP-DO-COMPUTADOR` pelo IPv4 do computador que executa a API. No Windows, consulta o IPv4 com `ipconfig`.

```dotenv
EXPO_PUBLIC_API_URL=http://IP-DO-COMPUTADOR:8000/api
EXPO_PUBLIC_API_HEALTH_URL=http://IP-DO-COMPUTADOR:8000/api/health
```

O ecrã de diagnóstico usa EXPO_PUBLIC_API_HEALTH_URL. O endereço base EXPO_PUBLIC_API_URL inclui /api e é utilizado nos pedidos de login, consulta do utilizador e logout. Estas variáveis são públicas e não devem conter segredos. Depois de alterar .env.local, reinicia o Expo e recarrega a aplicação.

Num telemóvel físico, `localhost` aponta para o próprio telemóvel. No emulador padrão do Android Studio, utiliza `http://10.0.2.2:8000/api` para aceder à API no computador anfitrião.

### 4. Disponibilizar a API na rede local

Mantém o MySQL/MariaDB ligado e as migrações aplicadas. Num terminal separado, dentro de cleancheck-api/api, executa:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Para testar num telemóvel físico, liga o computador e o telemóvel à mesma rede Wi-Fi e permite a ligação na firewall da rede privada.

A aplicação mobile comunica com a API e não acede diretamente à base de dados. Os endereços HTTP apresentados destinam-se ao desenvolvimento local; o ambiente publicado deve utilizar HTTPS.

### 5. Iniciar a aplicação

Dentro de `cleancheck-mobile/mobile`, executa:

```bash
npx expo start
```

No Android, lê o QR code através do Expo Go. No iPhone, utiliza a câmara para abrir a aplicação no Expo Go. Se tiveres um emulador Android configurado e iniciado, prime `a` no terminal.

Para parar o servidor, utiliza `Ctrl+C`.

## Estrutura principal

Estrutura prevista para o modelo `blank-typescript`; as pastas devem ser criadas conforme necessário:

```text
assets/            Imagens, ícones e fontes
src/components/    Componentes reutilizáveis
src/screens/       Ecrãs da aplicação
src/navigation/    Navegação, quando configurada
src/hooks/         Hooks reutilizáveis
src/services/     Comunicação com a API
src/types/        Tipos e interfaces TypeScript
src/utils/        Funções auxiliares
App.tsx           Componente principal
app.json          Configuração da aplicação Expo
```

## Comandos úteis

Executar os comandos seguintes dentro de `cleancheck-mobile/mobile`, após instalar as dependências:

Listar os scripts disponíveis:

```bash
npm run
```

Verificar os tipos TypeScript:

```bash
npx tsc --noEmit
```

Verificar a configuração e compatibilidade do projeto Expo:

```bash
npx expo-doctor
```

Verificar se as versões das dependências estão alinhadas com o SDK Expo:

```bash
npx expo install --check
```

Reiniciar o servidor com limpeza da cache:

```bash
npx expo start --clear
```

Instalar uma biblioteca através do Expo:

```bash
npx expo install nome-do-pacote
```

Substitui `nome-do-pacote` pela biblioteca pretendida. As verificações de tipos e compatibilidade não substituem testes num dispositivo. Lint, testes automatizados e distribuição de builds ainda precisam de ser configurados.

## Configuração e ficheiros locais

O ficheiro `.env.local` contém a configuração de cada instalação e deve estar incluído no `.gitignore`, sem ser enviado para o GitHub.

O `.env.example` deve conter apenas configurações de exemplo, sem passwords, chaves privadas ou outros dados sensíveis. As variáveis `EXPO_PUBLIC_*` são públicas e incluídas na aplicação.

As pastas `node_modules/` e `.expo/` não são incluídas no repositório. As dependências são instaladas através de `npm ci`.

O ficheiro `package-lock.json` deve permanecer no repositório para manter as versões das dependências consistentes entre os elementos da equipa. Ficheiros de assinatura e credenciais de publicação não devem ser enviados para o GitHub.

Após alterações ao `.env.local`, reinicia o Expo e recarrega a aplicação.

## Contribuição

1. Atualiza a tua cópia da branch de integração.
2. Cria uma branch para a alteração.
3. Implementa em TypeScript e verifica o funcionamento num dispositivo ou emulador.
4. Envia a branch para o GitHub.

A branch de integração deste repositório se chama `main`, como indicado no projeto API. Consulta o [CONTRIBUTING.md](./CONTRIBUTING.md) para conhecer as convenções propostas.

Sempre que uma alteração modificar os passos de instalação ou configuração, este README deve ser atualizado.

## Diagnóstico da API

O ecrã de diagnóstico consulta `GET /api/health`, valida os campos `application: "CleanCheck"` e `status: "ok"` e apresenta estados de carregamento, sucesso ou erro. Permite repetir o pedido e tem um tempo limite de 10 segundos. Este diagnóstico não substitui os testes de autenticação.

### Teste com a API ligada

- Dispositivo: iPhone 16 Pro Max, iOS 27.
- Aplicação: Expo Go.
- API: php artisan serve --host=0.0.0.0 --port=8000.
- Rota de diagnóstico: /api/health, através do IPv4 do computador.
- Resultado: pendente de validação na aplicação.

### Teste com a API desligada

1. Foi parado o servidor Laravel com `Ctrl+C`.
2. Na aplicação, tocar em **Testar novamente**.
3. Resultado: pendente de validação na aplicação.

Após o teste, o servidor Laravel foi iniciado novamente.

## Teste da configuração inicial

- Ambiente: Windows e iPhone 16 Pro Max com iOS 27.
- Aplicação: Expo Go.
- Comando: npx expo start, executado na pasta mobile.
- Procedimento: ler o QR code com a Câmara do iPhone e abrir o projeto no Expo Go.
- Resultado: aplicação iniciada com sucesso.

Esta validação confirmou a execução inicial da base mobile. A ligação à API foi validada separadamente no teste de diagnóstico acima; as funcionalidades de negócio e a autenticação serão desenvolvidas nas tarefas seguintes.
