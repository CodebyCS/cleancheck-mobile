# Ensaio de câmara e envio de provas

Registo do ensaio da Sprint 4: tirar fotografia, gravar vídeo e enviar um ficheiro fictício para a API protegida a partir de um telemóvel real.

**Isto é um ensaio.** O ficheiro vai para `POST /api/evidence-trials`, não fica ligado a nenhuma tarefa e não conta como prova da limpeza. O fluxo completo (vídeo inicial e final por tarefa, checklist, vistoria e supervisão) está descrito em [FLUXOS_FUTUROS.md](FLUXOS_FUTUROS.md) e fica para os sprints seguintes.

## Como fazer o ensaio

1. API a correr com o endpoint de ensaio (contrato em `cleancheck-api/Docs/contracts/evidence-trial.md`).
2. No `php.ini` da API: `upload_max_filesize = 50M` e `post_max_size = 55M`.
3. `EXPO_PUBLIC_API_URL` no `.env` do mobile a apontar para a API (IP do computador na rede ou túnel).
4. Entrar com uma conta de prestador (dados fictícios do seeder).
5. **Perfil → Ensaio de câmara.**
6. Para cada caso da tabela abaixo: escolher a origem, preencher "Aparelho e rede", enviar e copiar para o registo o que o ecrã mostra.

## O que a app e a API aceitam

| | Fotografia | Vídeo |
|---|---|---|
| Formatos | JPG, PNG, WEBP, HEIC | MP4, MOV |
| Tamanho máximo | 10 MB | 50 MB |
| Duração máxima na câmara | — | 60 s |
| Tempo máximo de envio na app | 2 min | 2 min |

## Aparelhos usados

| # | Aparelho | Sistema | Build instalada (EAS) | Quem testou |
|---|---|---|---|---|
| E1 | Emulador Android Medium Phone API 37 | Android 16 (API 37) | Build instalável EAS `e85561ad-a89e-4ade-a8f9-88172af3d8ae` | Pedro Maia (ensaio assistido) |
| E2 | Mesmo emulador | Android 16 (API 37) | Build instalável EAS `300207f6-760e-4e05-937d-6a328b0aed33` | Pedro Maia (ensaio assistido) |
| A1 | | | | |
| A2 | | | | |

### Execução E1 — API local

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
| 3 | A1 | Wi-Fi | Vídeo 60 s (câmara) | | | | | |
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
| Ficheiro acima do limite | Enviar vídeo com mais de 50 MB | "O ficheiro não pode ter mais de 50 MB." ou, se o PHP cortar antes, "O servidor recusou o ficheiro por ser demasiado grande…" | |
| Sem rede | Modo de avião antes de enviar | "Não foi possível contactar a API. Verifica a ligação e tenta novamente." | |
| Envio lento | Vídeo grande em rede fraca | "O envio demorou mais de 2 minutos e foi cancelado…" | |
| Muitos envios | Mais de 10 envios num minuto | "Demasiados envios seguidos. Espera um minuto e tenta outra vez." | |
| Sessão expirada | Terminar a sessão noutro aparelho e enviar | Mensagem de sessão expirada e volta ao login | |

## Armazenamento

- Os ficheiros ficam na API em `storage/app/private/evidence-trials/{user_id}/`, sem link público.
- Espaço ocupado no fim do ensaio: ______ MB, em ______ ficheiros.
- Um vídeo de 60 s ocupa cerca de ______ MB no aparelho ______.

## Limitações encontradas

- Aparelho: ______
- Rede: ______
- Servidor: ______

## Dúvidas para o cliente

- Duração máxima dos vídeos inicial e final de cada limpeza.
- Qualidade mínima aceitável (resolução) face ao tamanho dos ficheiros.
- Durante quanto tempo os vídeos e as fotografias devem ser guardados.
- Se o envio pode esperar por Wi-Fi ou tem de ser feito logo no local, com dados móveis.

## Conclusão

Viável / viável com condições / não viável: ______

Ensaio feito por ______ e ______ em __/__/2026. Reproduzido por ______ em __/__/2026.

### Validação automatizada e pendências desta revisão

- `npx.cmd tsc --noEmit`: passou.
- `npm test` e `npm run lint`: não disponíveis, porque o `package.json` não define estes scripts.
- O teste de feature `EvidenceTrialTest` da API não pôde arrancar: falta `api/vendor/autoload.php` neste checkout. Não foi alterada a API.
- Ainda falta testar um ficheiro acima do limite e os erros `422` numa build instalada, repetir a captura num aparelho físico e registar a validação do Martim.
- O endpoint testado é `POST /api/evidence-trials`: o ficheiro não fica associado a uma tarefa. A integração final de provas por tarefa depende do contrato/fluxo confirmado com Martim.
