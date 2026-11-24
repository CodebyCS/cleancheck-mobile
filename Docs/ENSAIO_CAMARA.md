# Ensaio de câmara e envio de ficheiros

Este documento descreve a integração mobile do ensaio da Sprint 4: capturar ou selecionar um ficheiro e enviá-lo à API a partir de uma build instalável.

**Isto é apenas um ensaio técnico.** O endpoint atual é `POST /api/my/tasks/{task}/evidence-trials`: regista o ficheiro, a tarefa e o prestador autenticado. Não altera o estado da tarefa e o registo não é uma prova de produção nem alimenta a checklist, a vistoria ou a supervisão. O fluxo completo de provas fica para o Sprint 6 e deve ter contrato próprio.

## Build e ambiente do ensaio

A app tem dois perfis relevantes. Ambos geram uma app instalável sem Expo Go nem Metro:

| Perfil | Uso | API configurada |
|---|---|---|
| `preview-local` | Emulador Android ligado à API local do computador | `http://10.0.2.2:8000/api`; HTTP é permitido apenas neste perfil |
| `preview` | Build de equipa para aparelho físico ou emulador | `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_HEALTH_URL` configuradas no ambiente EAS `preview`; devem apontar para a API HTTPS partilhada |

Para o ambiente alojado atualmente partilhado pela equipa, os valores esperados são `EXPO_PUBLIC_API_URL=https://api.cleancheck.atec-porto.eu/api` e `EXPO_PUBLIC_API_HEALTH_URL=https://api.cleancheck.atec-porto.eu/api/health`. Confirmar que estes valores estão configurados no EAS antes de gerar a build; alterar variáveis depois do build não atualiza um APK já instalado.

Para gerar a build:

```powershell
cd mobile
npx.cmd eas-cli build --platform android --profile preview
```

Para um teste local apenas no emulador, usar `preview-local` em vez de `preview`. O endereço `10.0.2.2` não funciona num aparelho físico. Não usar Expo Go ou uma sessão Metro como evidência da build instalada.

Antes de executar o ensaio, instalar o APK, abrir a app pelo ícone, confirmar o endereço no ecrã **Diagnóstico da API** e testar a ligação. Iniciar sessão com uma conta fictícia `service_provider` que tenha uma tarefa atribuída. No ecrã **Perfil → Ensaio de câmara**, escolher essa tarefa, capturar ou selecionar o ficheiro e enviá-lo. A confirmação só conta como sucesso quando a app recebe `201` e mostra o ID do registo devolvido pela API.

Registar uma linha por execução; não reutilizar os IDs históricos abaixo como prova da versão atual do endpoint associado à tarefa:

| Data | ID da build EAS | Perfil | Ambiente/API | Aparelho e Android | Conta fictícia (sem password) | Resultado/erros |
|---|---|---|---|---|---|---|
| 24/11/2026 | `a6e25bde-7959-4981-9548-44013bbd7e99` | `preview` | API alojada `https://api.cleancheck.atec-porto.eu/api` | Emulador `Medium_Phone_API_37.0` (API 37) | `evertonduarte@cleancheck.test` (`service_provider`) | Health e login passaram; GET de tarefas mostrou tarefas #1 e #3 atribuídas. Fotografia fictícia JPEG de 62 KB, selecionada para a tarefa #1: envio falhou com `404`. Um POST sem autenticação à mesma rota também devolveu `404`, indicando que a rota ainda não está publicada nesta API. Nenhuma confirmação de envio foi apresentada. |

## Como fazer o ensaio

1. API com `POST /api/my/tasks/{task}/evidence-trials` disponível (contrato em `cleancheck-api/Docs/contracts/evidence-trial.md`).
2. No `php.ini` da API: `upload_max_filesize = 50M` e `post_max_size = 55M`; se aplicável, configurar o limite equivalente no proxy.
3. Build `preview` configurada no EAS com `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_API_HEALTH_URL` para a API HTTPS de teste; ou build `preview-local` para o emulador local.
4. Entrar com uma conta de prestador (dados fictícios do seeder).
5. **Perfil → Ensaio de câmara** e selecionar uma tarefa atualmente atribuída à conta.
6. Para cada caso da tabela abaixo: escolher a origem, preencher "Aparelho e rede", enviar e copiar para o registo o que o ecrã mostra.
7. Confirmar que a resposta apresenta o ID da tarefa associada. A API recusa tarefa inexistente (`404`) ou não atribuída ao prestador autenticado (`403`).

## O que a app e a API aceitam

| | Fotografia | Vídeo |
|---|---|---|
| Formatos | JPG, PNG, WEBP, HEIC, HEIF | MP4, MOV |
| Tamanho máximo | 10 MB | 50 MB |
| Duração máxima de vídeo | — | 60 s |
| Tempo máximo de envio na app | 2 min | 2 min |

O limite de duração é validado pela API para vídeos capturados ou escolhidos da galeria. A app também recusa antes do envio os vídeos cuja duração o seletor reporta acima do limite. O timeout indicado na tabela é o tempo máximo do pedido de envio, não a duração máxima do vídeo. Estes são os limites do endpoint experimental; os limites e regras do fluxo completo do Sprint 6 terão de ser confirmados no contrato próprio desse fluxo.

## Contrato usado no ensaio

- Método e endpoint: `POST /api/my/tasks/{task}/evidence-trials`.
- Autenticação: Bearer token válido; a operação é exclusiva do perfil `service_provider`.
- Corpo: `multipart/form-data`, com `file` obrigatório e `device` opcional (máximo de 120 caracteres).
- Associação: o ID da tarefa está no caminho da rota; o autor é o prestador autenticado. A API confirma que a tarefa continua atribuída ao prestador antes de registar o envio.
- Sucesso: `201` com `data.id`, `data.task_id`, tipo, MIME, tamanho, nome original, aparelho e hora de receção.
- Erros principais: `401` sessão inválida, `403` tarefa não atribuída, `404` tarefa inexistente/apagada, `422` ficheiro/formato/tamanho/duração inválido e `429` limite de pedidos.
- O ficheiro é guardado em armazenamento privado e o registo é experimental; não altera o estado da tarefa nem constitui prova final.

O contrato detalhado, incluindo formatos MIME e mensagens de validação, está em `cleancheck-api/Docs/contracts/evidence-trial.md`.

## Aparelhos usados

| # | Aparelho | Sistema | Build instalada (EAS) | Quem testou |
|---|---|---|---|---|
| E1 | Emulador Android Medium Phone API 37 | Android 16 (API 37) | Build instalável EAS `e85561ad-a89e-4ade-a8f9-88172af3d8ae` | Pedro Maia (ensaio assistido) |
| E2 | Mesmo emulador | Android 16 (API 37) | Build instalável EAS `300207f6-760e-4e05-937d-6a328b0aed33` | Pedro Maia (ensaio assistido) |
| A1 | | | | |
| A2 | | | | |

### Execução E1 — API local

Estes registos foram feitos antes da associação do upload à tarefa e validam apenas a câmara, permissões e transporte de ficheiros na build daquela altura. Não confirmam o endpoint atual `POST /api/my/tasks/{task}/evidence-trials`, a autorização por tarefa nem a gravação da associação. Para a versão atual, preencher a tabela “Build e ambiente do ensaio” acima após executar o teste numa nova build.

| Passo | Resultado observado |
|---|---|
| Diagnóstico da API | `GET /api/health` devolveu `CleanCheck: ok · HTTP 200` no emulador. |
| Login do prestador | Login concluído com a API local. |
| Câmara negada | Depois de recusar a permissão, a app mostrou a mensagem de acesso à câmara e o atalho para abrir as definições. |
| Fotografia | Capturada no emulador (`image/jpeg`, 61 KB); o ecrã confirmou **Recebido pela API**. |
| Vídeo | Capturado no emulador (`video/mp4`, 1,3 MB, 15 s); o ecrã confirmou **Recebido pela API**. |
| Galeria | Selecionado um PNG local (`image/png`, 316 KB); o ecrã confirmou **Recebido pela API**. O aviso do seletor sobre media na cloud foi dispensado; não era necessário configurar uma origem cloud para escolher uma fotografia local. |
| Microfone negado | Na build E2, recusar o acesso ao iniciar vídeo mostrou a mensagem de microfone negado e o atalho para definições. Depois de conceder a permissão nas definições, tentar novamente abriu a câmara de vídeo. |
| Falha de rede e retry | Na build E2, enviar com modo de avião mostrou a mensagem de falha de ligação. Depois de repor a rede, tentar novamente com o mesmo ficheiro foi confirmado pela API. |
| Vídeo com microfone autorizado | Na build E2, depois de conceder a permissão, capturado um MP4 de 3 s (297 KB); o ecrã confirmou **Recebido pela API**. |
| Reteste E2 em 20/11/2026 | Na build instalada, a câmara recusada mostrou a opção para abrir definições; a galeria enviou um PNG de 435 KB e a câmara enviou um MP4 de 3 s (315 KB), ambos confirmados pela API. Com modo de avião, o envio mostrou erro de rede; após repor a ligação, o retry do mesmo ficheiro foi confirmado. |

O emulador usa a cena virtual da câmara e não substitui a validação da captura num aparelho físico. A API foi acedida no emulador através de `http://10.0.2.2:8000/api`; o perfil `preview-local` permite HTTP apenas para este ensaio local.

## Resultados

Preencher uma linha por envio. "Resultado" é o que o ecrã mostra: **Recebido pela API** ou a mensagem de erro.

| # | Aparelho | Rede | Origem | Formato detetado | Tamanho | Duração | Tempo de envio | Resultado |
|---|---|---|---|---|---|---|---|---|
| 1 | A1 | Wi-Fi | Fotografia (câmara) | | | — | | |
| 2 | A1 | Wi-Fi | Vídeo 10 s (câmara) | | | | | |
| 4 | A1 | 4G/5G | Vídeo 30 s (câmara) | | | | | |
| 5 | A1 | Wi-Fi | Galeria: ficheiro acima de 50 MB | | | | | |
| 6 | A2 | Wi-Fi | Fotografia (câmara) | | | — | | |
| 7 | A2 | Wi-Fi | Vídeo 10 s (câmara) | | | | | |
| 8 | A2 | 4G/5G | Vídeo 30 s (câmara) | | | | | |

## Casos de erro a confirmar

| Caso | Como provocar | Mensagem esperada | Confirmado |
|---|---|---|---|
| Permissão da câmara negada | Recusar o pedido de acesso | "Sem acesso à câmara. Podes tentar novamente ou abrir as definições do telemóvel." | Confirmado em E1 |
| Permissão do microfone negada | Recusar o pedido ao iniciar vídeo | "Sem acesso ao microfone. Podes tentar novamente ou abrir as definições do telemóvel." | Confirmado em E2 |
| Acesso a fotografias/ficheiros | Selecionar um ficheiro permitido no seletor do sistema | A app recebe apenas o ficheiro escolhido | Confirmado com PNG local em E1; a política do seletor Android não pede acesso amplo aos ficheiros |
| Ficheiro acima do limite | Enviar fotografia acima de 10 MB ou vídeo acima de 50 MB | A API rejeita com `422`; se o PHP/proxy interromper o pedido antes do Laravel, confirmar a resposta de upload demasiado grande configurada no servidor | |
| Vídeo acima do limite de duração | Escolher na galeria um MP4/MOV com duração superior ao máximo | "O vídeo não pode ter mais de 60 segundos." | |
| Sem rede | Modo de avião antes de enviar | "Não foi possível contactar a API. Verifica a ligação e tenta novamente." | |
| Envio lento | Vídeo grande em rede fraca | "O envio demorou mais de 2 minutos e foi cancelado…" | |
| Muitos envios | Mais de 10 envios num minuto | "Demasiados envios seguidos. Espera um minuto e tenta outra vez." | |
| Sessão expirada | Terminar a sessão noutro aparelho e enviar | Mensagem de sessão expirada e volta ao login | |

## Armazenamento e limites do ensaio

- A API guarda o ficheiro no disco privado `local`, sob `storage/app/private/evidence-trials/`, sem URL público.
- O registo experimental conserva autor, tarefa (quando enviada pela rota atual), metadados e caminho interno. A tarefa não é alterada e o registo não aparece como prova de produção.
- A política acordada para os ficheiros do ensaio é retenção por 30 dias. O download é restrito ao perfil `admin`, através do endpoint administrativo documentado pela API; o mobile não apresenta os ficheiros como evidências da tarefa.
- A rota legada `POST /api/evidence-trials` não associa o ficheiro a uma tarefa (`task_id: null`), mas também cria um registo experimental. A build atual deve usar apenas `POST /api/my/tasks/{task}/evidence-trials`.
- No fim do ensaio, registar o número de ficheiros e o espaço ocupado, se essa informação estiver disponível: ______ ficheiros / ______ MB.

## Limitações encontradas

- Aparelho: ______
- Rede: ______
- Servidor: ______

## Fora do âmbito deste ensaio

Os limites experimentais (fotografias até 10 MB; vídeos MP4/MOV até 50 MB e 60 segundos) não definem automaticamente os limites das provas do Sprint 6. Também ficam fora deste ensaio: associação a etapas inicial/final, substituição de ficheiros, checklist, vistoria, revisão/supervisão e consulta de provas no detalhe da tarefa. Esses comportamentos exigem contrato e validação próprios antes de serem apresentados como concluídos.

## Conclusão

Viável / viável com condições / não viável: ______

Ensaio feito por ______ e ______ em __/__/2026. Reproduzido por ______ em __/__/2026.

### Validação automatizada e pendências desta revisão

- `npx.cmd tsc --noEmit`: passou.
- `npm test` e `npm run lint`: não disponíveis, porque o `package.json` não define estes scripts.
- O teste de feature `EvidenceTrialTest` da API não pôde arrancar: falta `api/vendor/autoload.php` neste checkout. Não foi alterada a API.
- A build atual confirmou login, carregamento de tarefas e seleção/captura do ficheiro, mas não confirmou o envio associado: a API alojada devolveu `404` para `POST /api/my/tasks/1/evidence-trials`, inclusive num pedido sem autenticação, sinal de que a rota não está publicada no ambiente. Depois de integrar/publicar a API, repetir o envio nesta build ou gerar uma nova se o binário/configuração mudar. Ainda falta testar ficheiros inválidos/acima dos limites, obter a validação do Martim e repetir a captura num aparelho físico; o emulador não substitui essa verificação.
- Os ensaios E1/E2 acima foram realizados antes da associação a tarefas, usando `POST /api/evidence-trials`; não validam a autorização nem a gravação da tarefa. A build atual usa `POST /api/my/tasks/{task}/evidence-trials`, que regista a tarefa e o autor autenticado quando a tarefa está atribuída ao prestador. Continua a ser um ensaio, não uma prova final da limpeza.
