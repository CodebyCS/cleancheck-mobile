# Fluxos futuros do prestador — mobile

Define os ecrãs, as ações, os dados, as validações e os erros dos fluxos que vêm depois do Perfil e das Minhas Tarefas. A implementação fica para os próximos sprints; este documento serve de referência para o mobile e para os contratos da API.

**Estado:** proposta para rever com o Pedro e a equipa. O que está marcado **(a confirmar)** ainda não foi decidido.

## Componentes partilhados

| Componente | Uso atual | Uso previsto |
|---|---|---|
| `ProfileAvatar` | Fotografia ou iniciais no Perfil | Prestador responsável na vistoria e na supervisão |
| `InfoRow` | E-mail, telefone e morada no Perfil | Dados do imóvel, horários e estado da tarefa nos fluxos abaixo |

Regras do Perfil, já em uso:
- A etiqueta de função é **Prestador** (`service_provider`).
- Dados em falta mostram "Não indicado/a" a cinzento.
- A fotografia usa um URL assinado com validade curta; puxar para atualizar renova-o.

## Percurso de uma tarefa

1. Minhas Tarefas
2. Detalhe da tarefa
3. Iniciar
4. Checklist e evidências (ou reportar impedimento)
5. Concluir
6. Supervisão

Estados da tarefa na API: `pending`, depois `in_progress`, depois `completed` (ou `cancelled`). Hoje a API não tem endpoint para mudar o estado; iniciar e concluir **(a criar na API)**.

## 1. Checklist da limpeza

**Ecrã:** dentro do detalhe da tarefa, depois de **Iniciar**.

| | |
|---|---|
| **Ações** | Marcar/desmarcar cada item; acrescentar nota a um item; concluir quando os itens obrigatórios estiverem feitos |
| **Dados** | Lista de itens por tipo de tarefa (`checkout_cleaning`, `checkin_inspection`): `id`, `label`, `required`, `done`, `note` **(endpoint a criar)** |
| **Validações** | Só a tarefa `in_progress` e atribuída ao prestador pode ser alterada; todos os itens `required` marcados antes de concluir; nota até 500 caracteres **(a confirmar)** |
| **Erros** | `403`/`404` tarefa já não atribuída: mensagem e voltar à lista; `422` itens obrigatórios em falta: assinalar os itens; sem rede: manter as marcações no dispositivo e reenviar |

## 2. Evidências (vídeo e fotografias)

**Ecrã:** passos **Antes da limpeza** e **Depois da limpeza** no detalhe (hoje são simulação local).

| | |
|---|---|
| **Ações** | Gravar vídeo inicial; gravar vídeo final; tirar fotografias de danos ou faltas; repetir uma gravação antes de enviar |
| **Dados** | `type` (`initial_video`, `final_video`, `photo`), ficheiro, `captured_at`, `task_id` **(endpoint de upload a criar)** |
| **Validações** | Vídeo final só depois do inicial; tipos e tamanho máximo **(a confirmar: duração e MB)**; câmara e microfone com permissão; envio só com a tarefa `in_progress` |
| **Erros** | Permissão negada: explicar como ativar nas definições; ficheiro grande ou formato inválido (`422`): mensagem no passo; falha de envio: manter o ficheiro e mostrar **Tentar novamente**; `401`: sessão terminada |

## 3. Vistoria (check-in)

**Tarefa:** `checkin_inspection`. O prazo (`scheduled_end_at`) é 14:30 do dia do check-in, ou a hora de entrada do imóvel menos 30 min.

| | |
|---|---|
| **Ações** | Ver imóvel, morada e prazo; percorrer a checklist da vistoria; registar fotografias; dar a vistoria como **OK** ou **Com problemas** |
| **Dados** | Tarefa (`GET /api/tasks/{id}`), checklist da vistoria, evidências, resultado (`ok`/`issues`) e nota **(a criar)** |
| **Validações** | Não permitir iniciar depois do prazo **(a confirmar)**; resultado obrigatório; com **Com problemas**, nota ou fotografia obrigatória |
| **Erros** | Prazo ultrapassado: aviso e contacto com o supervisor; os mesmos erros de rede e sessão das evidências |

## 4. Supervisão

**Quem:** supervisor (web e, no futuro, mobile **(a confirmar)**).

| | |
|---|---|
| **Ações** | Ver tarefas concluídas; ver checklist, vídeos e fotografias; aprovar ou devolver ao prestador com motivo |
| **Dados** | Tarefa concluída, evidências, checklist, `review_status` (`approved`/`rejected`), `review_note`, revisor e data **(a criar)** |
| **Validações** | Só `admin`/`supervisor`; motivo obrigatório ao devolver; uma tarefa aprovada não volta ao prestador |
| **Erros** | `403` sem permissão; `409`/`422` tarefa já revista por outra pessoa: atualizar o ecrã |
| **Prestador** | Recebe aviso no separador **Avisos** quando a tarefa é devolvida, com o motivo |

## 5. Impedimento (já existe na API)

`POST /api/tasks/{task}/impediments` com `reason` (obrigatório, até 120), `description` (opcional, até 2000) e `idempotency_key` (UUID). Só o prestador atribuído pode reportar. No mobile: botão **Reportar impedimento** no detalhe, com motivo e descrição; a `idempotency_key` evita duplicados ao repetir o envio sem rede.
