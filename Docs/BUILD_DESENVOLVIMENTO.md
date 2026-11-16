# Builds instaláveis para Android e iPhone

O projeto usa EAS Build para gerar builds na cloud. Os identificadores Android e iOS são `com.codebycs.cleancheck` e estão definidos em `mobile/app.json`.

## Perfis EAS

- `development`: inclui Expo Development Client para desenvolvimento com Metro.
- `preview`: build interna autónoma, com o JavaScript incluído; o colega pode abrir a app sem depender do Metro do autor. É o perfil usado para testes em dispositivos.
- `production`: reservado para distribuição de produção.

## Preparação da conta Expo/EAS

Cada pessoa pode autenticar-se com a sua conta Expo. O projeto EAS está associado pelo `extra.eas.projectId` em `mobile/app.json`; mantém esse ID versionado para todos usarem o mesmo projeto.

No PowerShell, a partir da pasta `mobile/`:

```powershell
npx.cmd eas-cli login
```

Não é necessário executar `eas init` novamente se o projeto já estiver associado. Não guardes passwords, certificados, chaves privadas ou ficheiros de assinatura no repositório. As credenciais Android podem ser geridas pelo EAS.

## Build Android para teste

Na pasta `mobile/`, gera uma build interna com:

```powershell
npx.cmd eas-cli build --platform android --profile preview
```

O perfil `preview` usa distribuição interna. O EAS disponibiliza uma página/link e um APK instalável; não é necessário publicar na Google Play nem ter conta Google Play Console para este teste. O build Android já foi gerado para esta branch. Partilha o link do build com o colega que fará a validação num dispositivo Android.

### Instalação e validação pelo colega

1. Abrir o link do build num dispositivo Android.
2. Descarregar e instalar o APK. Se o Android pedir autorização, permitir a instalação a partir do browser usado para abrir o link.
3. Abrir a app e confirmar que inicia sem Metro.
4. Testar a ligação à API e registar o resultado; reportar qualquer erro com captura/log relevante.

A instalação e o ensaio funcional num Android ainda dependem de um colega com dispositivo compatível.

## Builds iOS (opcional)

Para iOS, gera uma build interna com:

```powershell
npx.cmd eas-cli build --platform ios --profile preview
```

A distribuição interna em iPhone requer uma conta Apple Developer válida e registo do UDID de cada dispositivo (`npx.cmd eas-cli device:create`). As builds ad hoc só podem ser instaladas nos dispositivos incluídos no perfil. Ao adicionar um aparelho depois da build, é necessário gerar outra build. Em iOS 16 ou posterior, poderá ser necessário ativar o Modo de Programador.

Para uma build de desenvolvimento ligada ao Metro:

```powershell
npx.cmd eas-cli build --platform android --profile development
```

## Configuração da API

A build autónoma precisa de `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_HEALTH_URL` configuradas no ambiente `preview` do projeto EAS. Usa um endereço da API de teste acessível a partir do dispositivo; `localhost` e o `.env.local` do computador do autor não ficam disponíveis no telemóvel do colega. Estas variáveis são incorporadas na app e não podem conter segredos.

## Estado da validação

A configuração EAS para Android está preparada e foi gerado um build `preview`. Ainda falta a instalação e o teste funcional por um colega num dispositivo Android. A validação iOS não faz parte deste ensaio e requer credenciais Apple e um iPhone registado.
