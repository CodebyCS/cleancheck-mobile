# CleanCheck Mobile

Aplicação mobile do projeto CleanCheck, uma aplicação de apoio à gestão de serviços de limpeza e acompanhamento de prestadores em alojamentos.

Este repositório destina-se à aplicação em React Native com TypeScript, que utiliza a API Laravel do projeto.

## Estado atual

Projeto em fase inicial de configuração e desenvolvimento.

A equipa acordou a utilização de TypeScript nos projetos web e mobile. Este README descreve a configuração prevista com Expo e o modelo `blank-typescript`; nesta pasta existe apenas documentação. Os passos de instalação pressupõem que o código inicial, o `package-lock.json` e o `.env.example` já foram adicionados ao repositório.

## Tecnologias

- React Native
- TypeScript
- Expo
- Node.js
- npm

Após a criação da aplicação, as dependências e os requisitos de versão encontram-se no ficheiro `package.json`. O ficheiro `package-lock.json` regista as versões utilizadas pelo projeto.

## Requisitos

Antes de começar, instala:

- Git
- Node.js numa versão LTS compatível com o SDK Expo do projeto
- npm, incluído na instalação do Node.js
- Expo Go num telemóvel compatível com o SDK do projeto, ou um emulador Android configurado através do Android Studio

A API Laravel deve estar em execução para utilizar as funcionalidades que dependem do backend. As versões exatas das ferramentas devem ser registadas quando o ambiente da equipa estiver definido.

O simulador iOS exige macOS e Xcode. No Windows, é possível testar num iPhone físico através do Expo Go quando as funcionalidades forem compatíveis. Módulos nativos não incluídos no Expo Go exigem um development build.

## Instalação local

### 1. Clonar o repositório

```bash
git clone https://github.com/CodebyCS/cleancheck-mobile
cd cleancheck-mobile
```

### 2. Instalar as dependências

```bash
npm ci
```

Este comando utiliza o `package-lock.json` versionado. Na preparação inicial do projeto, executar `npm install` para gerar esse ficheiro, caso ainda não exista.

### 3. Criar o ficheiro de configuração

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

No Linux ou macOS:

```bash
cp .env.example .env.local
```

### 4. Configurar a ligação à API

Edita o ficheiro `.env.local` com o endereço da tua API local:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
```

Substitui `192.168.1.100` pelo IPv4 do computador que executa a API. No Windows, podes consultar esse endereço com `ipconfig`.

A camada de comunicação com a API deverá ler `process.env.EXPO_PUBLIC_API_URL`. Definir a variável não implementa, por si só, os pedidos à API.

Num telemóvel físico, `localhost` aponta para o próprio telemóvel. No emulador padrão do Android Studio, utiliza `http://10.0.2.2:8000/api` para aceder à API no computador anfitrião.

### 5. Disponibilizar a API na rede local

Num terminal separado, dentro da pasta do projeto API, executa:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Para testar num telemóvel físico, liga o computador e o telemóvel à mesma rede Wi-Fi e permite a ligação na firewall da rede privada.

A aplicação mobile comunica com a API e não acede diretamente à base de dados. Os endereços HTTP apresentados destinam-se ao desenvolvimento local; o ambiente publicado deve utilizar HTTPS.

### 6. Iniciar a aplicação

Dentro da pasta do projeto mobile, executa:

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

Depois de gerar a aplicação e instalar as dependências:

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

A branch de integração deste repositório se chama `develop`, como indicado no projeto API. Consulta o [CONTRIBUTING.md](./CONTRIBUTING.md) para conhecer as convenções propostas.

Sempre que uma alteração modificar os passos de instalação ou configuração, este README deve ser atualizado.
