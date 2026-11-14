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

| # | Aparelho | Sistema | Versão Expo Go | Quem testou |
|---|---|---|---|---|
| A1 | | | | |
| A2 | | | | |

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
| Permissão da câmara negada | Recusar o pedido de acesso | "Sem acesso à câmara. Ativa a permissão nas definições do telemóvel." | |
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
