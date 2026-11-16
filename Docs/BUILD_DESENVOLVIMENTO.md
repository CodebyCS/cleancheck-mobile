# Build instalável para iPhone

O projeto usa EAS Build para gerar builds iOS na cloud. O identificador iOS é `com.codebycs.cleancheck` e está definido em `mobile/app.json`.

## Perfis

- `development`: inclui Expo Development Client para desenvolvimento com Metro.
- `preview`: build interna autónoma, com o JavaScript incluído; o colega pode abrir a app sem depender do Metro do autor. Este é o perfil indicado para o ensaio da issue #17.
- `production`: reservado para distribuição de produção.

## Preparação inicial da conta Expo/EAS

Cada pessoa pode autenticar-se com a sua conta Expo. Para associar este projeto à conta que vai gerar as builds:

1. Na pasta `mobile/`, executa `npx eas-cli login` e autentica-te com a conta Expo escolhida pela equipa.
2. Executa `npx eas-cli init` para criar/associar o projeto EAS. O comando adiciona `extra.eas.projectId` a `app.json`; mantém esse ID versionado para todos usarem o mesmo projeto.
3. Na primeira build iOS, segue os pedidos do EAS para configurar as credenciais Apple. A equipa precisa de acesso a uma conta Apple Developer válida para distribuição interna em iPhone.
4. Regista o UDID de cada iPhone de teste com `npx eas-cli device:create`. As builds internas iOS usam provisioning ad hoc e só podem ser instaladas nos dispositivos incluídos no perfil; ao adicionar um aparelho depois da build, é necessário gerar outra build.

Não guardes passwords, certificados, chaves privadas ou ficheiros de assinatura no repositório. As credenciais de assinatura devem ser geridas pelo EAS/Apple.

## Gerar e instalar

Na pasta `mobile/`:

```powershell
npx eas-cli build --platform ios --profile preview
```

Quando a build terminar, partilha o link de instalação do EAS com o colega cujo iPhone foi registado. Em iOS 16 ou posterior, poderá ser necessário ativar o Modo de Programador no iPhone.

Para uma build ligada ao Metro durante desenvolvimento:

```powershell
npx eas-cli build --platform ios --profile development
```

## Configuração da API

A build autónoma precisa de `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_HEALTH_URL` configuradas no ambiente `preview` do projeto EAS. Usa o endereço HTTPS da API de teste acessível ao iPhone; o endereço `localhost` e o `.env.local` do computador do autor não ficam disponíveis no telemóvel do colega. Estas variáveis são incorporadas na app e não podem conter segredos.

## Estado da validação

A configuração de perfis e do identificador iOS está preparada. Ainda falta associar o projeto à conta Expo escolhida, configurar as credenciais Apple, definir a URL estável da API e gerar/instalar a build. A instalação por outro colega e o ensaio funcional só podem ser registados depois dessas etapas.
