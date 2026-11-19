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

## Teste local no emulador Android

O perfil `preview-local` gera um APK autónomo ligado à API do computador em
`http://10.0.2.2:8000/api`, com diagnóstico em `/api/health`.
Este endereço serve apenas para o emulador Android, não para telemóveis físicos.

1. Ligar a base de dados e executar `php artisan serve --host=0.0.0.0 --port=8000`
   na pasta da API. Manter o processo ligado.
2. Na pasta `mobile/`, executar:

```powershell
npx.cmd eas-cli build --platform android --profile preview-local
```

3. Instalar o APK resultante no emulador, substituindo a build anterior.
4. Abrir pelo ícone, sem Metro nem Expo Go. Confirmar o endereço no diagnóstico,
   testar a ligação, login e tarefas.

`app.config.js` permite HTTP no manifesto Android apenas com
`EAS_BUILD_PROFILE=preview-local`. Os restantes perfis mantêm a configuração existente.
As URLs ficam incorporadas no APK: editar variáveis não atualiza uma app instalada.
Quando existir API alojada, configurar as URLs HTTPS da equipa no ambiente
`preview` e gerar uma nova build com o perfil `preview`.

A build preview-local foi gerada e validada no emulador; os resultados estão abaixo.

## Execução da issue #17 — 19/11/2026

**Sistema acordado para este ensaio:** Android. iOS ficou fora do ensaio porque
não há conta Apple Developer da equipa disponível; responsável por acompanhar essa decisão: Pedro. O ensaio não dependeu do Expo Go nem do Metro.

**Build:** EAS `preview-local`, ID `280ce9ea-3354-4878-b521-f70c19fe0b8b`,
[registo da build](https://expo.dev/accounts/pedroatec/projects/cleancheck-mobile/builds/280ce9ea-3354-4878-b521-f70c19fe0b8b).
**Aparelho:** Android Emulator `Medium_Phone_API_37.0:5554`, Android 37.
**Ambiente:** API local `http://10.0.2.2:8000/api`, MySQL do XAMPP, dados
fictícios das migrations/seeders. Conta fictícia `prestador1@example.test`.

Resultados observados na app instalada:

- A app abriu pelo ícone sem Expo Go ou Metro: passou.
- Diagnóstico `GET /api/health`: `CleanCheck: ok`, HTTP 200.
- Login da conta fictícia: passou após criar a base `cleancheck` e executar
  `php artisan migrate --seed`. Antes disso, a API devolvia HTTP 500 por
  ausência da base após reinstalação do XAMPP.
- Minhas Tarefas: duas tarefas reais, uma em Hoje e outra em Próximas.
- Detalhe: abriu a tarefa pendente com morada, data/hora, prazo e tipo.
- Agenda: apresentou as mesmas tarefas em Hoje e Próximas.
- Avisos: endpoint consultado e estado vazio apresentado (`Sem avisos`).

Limitações: não havia avisos reais na base local para testar a abertura de uma
tarefa a partir de um aviso. Esse percurso pertence à demonstração integrada da
issue #18 e exige dados de teste apropriados. O emulador está no computador do
autor e o endereço `10.0.2.2` só funciona nele; instalação por outro colega
num Android físico e ligação ao ambiente partilhado continuam pendentes no
segundo ponto da issue #17. Responsável: Pedro/equipa, após disponibilização
da API alojada. Quando existir a URL HTTPS, gerar uma build `preview` e repetir
os testes de ligação e percursos essenciais nesse ambiente.
