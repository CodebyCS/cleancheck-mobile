import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import TaskEvidenceUploader from './TaskEvidenceUploader'
import { createIdempotencyKey } from '../services/taskImpediments'
import {
  submitMyTaskCheckoutInspection,
  submitMyTaskExecution,
  getMyTaskCheckoutInspection,
  getMyTaskChecklist,
  listMyTaskExecutions,
  markMyTaskChecklistItem,
  TaskChecklistError,
  TaskExecutionError,
  type AuthenticatedFetch,
  type TaskChecklist,
  type TaskChecklistItem,
  type TaskExecutionSubmission,
} from '../services/tasks'
import {
  getPendingTaskExecution,
  reconcilePendingTaskExecution,
  removePendingTaskExecution,
  savePendingTaskExecution,
  type PendingTaskExecution,
  type TaskExecutionKind,
} from '../services/pendingTaskExecutions'

type Props = { taskId: number; userId: number | string; authenticatedFetch: AuthenticatedFetch; taskStatus: string; taskType: string; checkoutCleaning: boolean }

function makeSubmission(responses: TaskExecutionSubmission['responses'], observations: string | null, evidenceIds: number[]): TaskExecutionSubmission {
  return { idempotency_key: createIdempotencyKey(), responses, observations, evidence_ids: evidenceIds }
}

export default function TaskExecutionWorkflow({ taskId, userId, authenticatedFetch, taskStatus, taskType, checkoutCleaning }: Props) {
  const [checklist, setChecklist] = useState<TaskChecklist | null>(null)
  const [checklistLoading, setChecklistLoading] = useState(true)
  const [checklistError, setChecklistError] = useState('')
  const [checklistPending, setChecklistPending] = useState<{ itemId: number; done: boolean } | null>(null)
  const [savingChecklistItemId, setSavingChecklistItemId] = useState<number | null>(null)
  const [observations, setObservations] = useState('')
  const [beforeEvidence, setBeforeEvidence] = useState<number[]>([])
  const [afterEvidence, setAfterEvidence] = useState<number[]>([])
  const [pending, setPending] = useState<Partial<Record<TaskExecutionKind, PendingTaskExecution>>>({})
  const [savedCheckoutInspection, setSavedCheckoutInspection] = useState<number | null>(null)
  const [savedExecutionId, setSavedExecutionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [executionStatusKnown, setExecutionStatusKnown] = useState(false)
  const [checkoutStatusKnown, setCheckoutStatusKnown] = useState(false)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)
  const [sending, setSending] = useState<TaskExecutionKind | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setExecutionStatusKnown(false)
    setCheckoutStatusKnown(!checkoutCleaning)
    setRecoveryUnavailable(false)

    async function recover() {
      let execution: PendingTaskExecution | null
      let checkout: PendingTaskExecution | null
      try {
        // Restore the exact local payload and idempotency keys before any API
        // lookup. A remote timeout must never make a pending send disappear.
        [execution, checkout] = await Promise.all([
          getPendingTaskExecution(taskId, userId, 'execution'),
          getPendingTaskExecution(taskId, userId, 'checkout-inspection'),
        ])
      } catch (localError) {
        if (!mounted) return
        setRecoveryUnavailable(true)
        setError(localError instanceof Error
          ? `${localError.message} Mantivemos os dados guardados e bloqueámos novos envios para evitar duplicados.`
          : 'Não foi possível ler os envios guardados. Mantivemos os dados e bloqueámos novos envios para evitar duplicados.')
        setLoading(false)
        return
      }

      let restoredCheckout = checkout ?? undefined
      const next = { execution: execution ?? undefined, 'checkout-inspection': restoredCheckout }
      if (execution) {
        setObservations(execution.submission.observations ?? '')
        setBeforeEvidence(execution.submission.evidence_ids)
      }
      setPending(next)
      if (restoredCheckout) setAfterEvidence(restoredCheckout.submission.evidence_ids)
      setLoading(false)

      // Reconcile the two remote confirmations independently. If either API
      // lookup fails, keep its pending payload/key available for an identical
      // retry and report a lookup problem instead of a local recovery failure.
      void reconcilePendingTaskExecution(
        execution ?? undefined,
        async () => (await listMyTaskExecutions(taskId, authenticatedFetch))[0] ?? null,
        (record) => record.idempotency_key,
      ).then(async (result) => {
        if (!mounted) return
        setExecutionStatusKnown(!result.error)
        if (result.confirmed) setSavedExecutionId(result.confirmed.id)
        if (execution && result.confirmed?.idempotency_key === execution.submission.idempotency_key) {
          await removePendingTaskExecution(taskId, userId, 'execution').catch(() => undefined)
          if (!mounted) return
          setPending((current) => ({ ...current, execution: undefined }))
        }
        if (result.error) setError(result.pending
          ? 'Não foi possível consultar se a execução já foi confirmada. Os mesmos dados e a mesma chave continuam guardados para retry.'
          : 'Não foi possível consultar o estado da execução. Novos envios ficam bloqueados até ser possível confirmar o estado atual.')
      })

      if (checkoutCleaning) {
        void reconcilePendingTaskExecution(
          checkout ?? undefined,
          () => getMyTaskCheckoutInspection(taskId, authenticatedFetch),
          (record) => record.idempotency_key,
        ).then(async (result) => {
          if (!mounted) return
          setCheckoutStatusKnown(!result.error)
          if (result.confirmed) {
            setSavedCheckoutInspection(result.confirmed.id)
            setAfterEvidence(result.confirmed.evidence_ids)
          }
          if (checkout && result.confirmed?.idempotency_key === checkout.submission.idempotency_key) {
            await removePendingTaskExecution(taskId, userId, 'checkout-inspection').catch(() => undefined)
            if (!mounted) return
            setPending((current) => ({ ...current, 'checkout-inspection': undefined }))
          }
          if (result.error) setError(result.pending
            ? 'Não foi possível consultar se a vistoria foi confirmada. Os mesmos anexos e a mesma chave continuam guardados para retry.'
            : 'Não foi possível consultar o estado da vistoria de saída. Novos envios ficam bloqueados até ser possível confirmar o estado atual.')
        })
      }
    }

    void recover()
    return () => { mounted = false }
  }, [taskId, userId, checkoutCleaning, authenticatedFetch])

  useEffect(() => {
    let mounted = true
    setChecklistLoading(true)
    setChecklistError('')
    setChecklist(null)
    setChecklistPending(null)
    void getMyTaskChecklist(taskId, authenticatedFetch).then((result) => {
      if (!mounted) return
      setChecklist(result)
    }).catch((loadError) => {
      if (!mounted) return
      setChecklistError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a checklist.')
    }).finally(() => {
      if (mounted) setChecklistLoading(false)
    })
    return () => { mounted = false }
  }, [taskId, authenticatedFetch])

  async function refreshChecklist() {
    setChecklistLoading(true)
    setChecklistError('')
    try {
      const result = await getMyTaskChecklist(taskId, authenticatedFetch)
      setChecklist(result)
    } catch (loadError) {
      setChecklistError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a checklist.')
    } finally {
      setChecklistLoading(false)
    }
  }

  async function saveChecklistItem(itemId: number, done: boolean) {
    if (taskStatus !== 'in_progress' || savingChecklistItemId !== null) return
    setSavingChecklistItemId(itemId)
    setChecklistError('')
    try {
      const updated = await markMyTaskChecklistItem(taskId, itemId, done, authenticatedFetch)
      if (updated === null) throw new TaskChecklistError('INVALID_RESPONSE', 'A API não devolveu a checklist atualizada.')
      setChecklist(updated)
      setChecklistPending(null)
    } catch (saveError) {
      // The server may have saved the requested value even if its response was
      // lost. Keep that exact value and offer an identical, idempotent retry.
      const resultUnknown = saveError instanceof TaskChecklistError
        && ['NETWORK', 'SERVER', 'INVALID_RESPONSE'].includes(saveError.code)
      setChecklistPending(resultUnknown ? { itemId, done } : null)
      setChecklistError(saveError instanceof Error ? saveError.message : 'Não foi possível confirmar a alteração da checklist.')
    } finally {
      setSavingChecklistItemId(null)
    }
  }

  function toggleItem(item: TaskChecklistItem) {
    if (taskStatus !== 'in_progress' || savingChecklistItemId !== null) return
    if (checklistPending) {
      if (checklistPending.itemId === item.id) void saveChecklistItem(checklistPending.itemId, checklistPending.done)
      return
    }
    void saveChecklistItem(item.id, !item.done)
  }

  async function send(kind: TaskExecutionKind) {
    if (recoveryUnavailable) return
    if (!pending[kind] && !(kind === 'execution' ? executionStatusKnown : checkoutStatusKnown)) {
      setError('Ainda não foi possível confirmar o estado atual. Tenta novamente quando a ligação estiver disponível.')
      return
    }
    setSending(kind)
    setError('')
    setMessage('')
    try {
      let saved = pending[kind]
      if (!saved) {
        const submission = kind === 'execution'
          ? makeSubmission([], observations.trim() || null, beforeEvidence)
          : makeSubmission([], null, afterEvidence)
        saved = { taskId, userId, kind, submission }
        await savePendingTaskExecution(saved)
        setPending((current) => ({ ...current, [kind]: saved }))
      }
      const result = kind === 'execution'
        ? await submitMyTaskExecution(taskId, saved.submission, authenticatedFetch)
        : await submitMyTaskCheckoutInspection(taskId, saved.submission, authenticatedFetch)
      await removePendingTaskExecution(taskId, userId, kind)
      setPending((current) => ({ ...current, [kind]: undefined }))
      if (kind === 'checkout-inspection') setSavedCheckoutInspection(result.record.id)
      else setSavedExecutionId(result.record.id)
      setMessage(kind === 'execution'
        ? `Execução confirmada pela API.${result.repeated ? ' O servidor confirmou o envio anterior.' : ''}`
        : `Vistoria de saída confirmada pela API.${result.repeated ? ' O servidor confirmou o envio anterior.' : ''}`)
    } catch (sendError) {
      if (kind === 'execution' && sendError instanceof TaskExecutionError && sendError.code === 'VALIDATION') {
        try {
          await removePendingTaskExecution(taskId, userId, kind)
          setPending((current) => ({ ...current, [kind]: undefined }))
          setError(`${sendError.message} O servidor rejeitou o pedido; podes corrigir os dados e enviar com uma chave nova.`)
        } catch {
          setError('O servidor rejeitou o pedido, mas não conseguimos limpar o envio local. Mantém os dados e tenta novamente com a mesma chave.')
        }
      } else {
        setError(sendError instanceof Error ? sendError.message : 'Não foi possível confirmar o envio. Os mesmos dados e a mesma chave foram mantidos para retry.')
      }
    } finally {
      setSending(null)
    }
  }

  const executionPending = Boolean(pending.execution)
  const checkoutPending = Boolean(pending['checkout-inspection'])
  const executionSaved = savedExecutionId !== null && !executionPending

  if (loading) return <View style={styles.card}><ActivityIndicator color="#1769E8" /><Text style={styles.copy}>A recuperar envios pendentes...</Text></View>

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Checklist e provas</Text>
      <Text style={styles.copy}>A checklist e o progresso são carregados e guardados pela API para esta tarefa.</Text>
      <Text style={styles.section}>{taskType === 'checkin_inspection' ? 'Prova da inspeção' : 'Antes da limpeza'}</Text>
      <TaskEvidenceUploader taskId={taskId} authenticatedFetch={authenticatedFetch} phaseLabel={taskType === 'checkin_inspection' ? 'Prova da inspeção' : 'Prova anterior'} disabled={executionPending || executionSaved} onUploaded={(evidence) => {
        setBeforeEvidence((current) => current.includes(evidence.id) ? current : [...current, evidence.id])
      }} />
      {beforeEvidence.length > 0 && <Text style={styles.copy}>{beforeEvidence.length === 1 ? '1 ficheiro confirmado para associar.' : `${beforeEvidence.length} ficheiros confirmados para associar.`}</Text>}

      <Text style={styles.section}>{taskType === 'checkin_inspection' ? 'Checklist da inspeção' : 'Checklist da tarefa'}</Text>
      {checklistLoading
        ? <View style={styles.inlineState}><ActivityIndicator color="#1769E8" /><Text style={styles.copy}>A carregar checklist da tarefa...</Text></View>
        : checklistError !== '' && checklist === null
          ? <View style={styles.inlineState}><Text accessibilityRole="alert" style={styles.error}>{checklistError}</Text><Pressable accessibilityRole="button" onPress={() => void refreshChecklist()} style={styles.retryButton}><Text style={styles.retryText}>Tentar carregar novamente</Text></Pressable></View>
          : checklist === null
            ? <Text style={styles.copy}>Ainda não existe uma checklist configurada para esta tarefa.</Text>
            : <>
              <Text style={styles.copy}>{checklist.name} · versão {checklist.version} · {checklist.required_done}/{checklist.required_total} itens obrigatórios concluídos (* obrigatório)</Text>
              {checklistPending && <Text style={styles.pending}>A alteração ainda não foi confirmada. Toca no mesmo item para repetir exatamente o mesmo valor.</Text>}
              {checklistError !== '' && <Text accessibilityRole="alert" style={styles.error}>{checklistError}</Text>}
              {checklist.items.map((item) => {
                const canEdit = taskStatus === 'in_progress'
                const retryingThis = checklistPending?.itemId === item.id
                const disabled = !canEdit || savingChecklistItemId !== null || (checklistPending !== null && !retryingThis)
                return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: item.done, disabled }} disabled={disabled} onPress={() => toggleItem(item)} style={styles.checkRow}>
                  <Text style={styles.checkbox}>{savingChecklistItemId === item.id ? '…' : item.done ? '☑' : '☐'}</Text>
                  <Text style={styles.item}>{item.label}{item.required ? ' *' : ''}</Text>
                  {retryingThis && <Text style={styles.retryText}>Repetir</Text>}
                </Pressable>
              })}
              {taskStatus !== 'in_progress' && <Text style={styles.copy}>A checklist fica só para consulta quando a tarefa não está em curso.</Text>}
            </>}
      <TextInput accessibilityLabel="Observações da execução" value={observations} onChangeText={setObservations} editable={!executionPending && !executionSaved && sending === null} maxLength={5000} multiline textAlignVertical="top" placeholder="Observações (opcional)" style={styles.input} />
      {executionPending && <Text style={styles.pending}>Existe uma execução por confirmar. O retry usa exatamente as mesmas respostas, evidências e chave.</Text>}
      {executionSaved
        ? <><Text style={styles.success}>Execução confirmada pela API.</Text><Pressable accessibilityRole="button" onPress={() => {
          setSavedExecutionId(null); setObservations(''); setBeforeEvidence([]); setMessage('')
        }} style={styles.button}><Text style={styles.buttonText}>Iniciar nova execução</Text></Pressable></>
        : <Pressable accessibilityRole="button" disabled={sending !== null || recoveryUnavailable || (!executionPending && !executionStatusKnown)} onPress={() => void send('execution')} style={[styles.button, (sending !== null || recoveryUnavailable || (!executionPending && !executionStatusKnown)) && styles.disabled]}>
          <Text style={styles.buttonText}>{sending === 'execution' ? 'A enviar...' : executionPending ? 'Tentar novamente' : 'Guardar execução'}</Text>
        </Pressable>}

      {checkoutCleaning && <>
        <Text style={styles.section}>Depois da limpeza · vistoria de saída</Text>
        <Text style={styles.copy}>A API só aceita este registo a partir da hora prevista de check-out e permite uma vistoria por tarefa.</Text>
        <TaskEvidenceUploader taskId={taskId} authenticatedFetch={authenticatedFetch} phaseLabel="Prova posterior" disabled={checkoutPending || savedCheckoutInspection !== null} onUploaded={(evidence) => {
          setAfterEvidence((current) => current.includes(evidence.id) ? current : [...current, evidence.id])
        }} />
        {afterEvidence.length > 0 && <Text style={styles.copy}>{afterEvidence.length === 1 ? '1 ficheiro confirmado para associar.' : `${afterEvidence.length} ficheiros confirmados para associar.`}</Text>}
        {checkoutPending && <Text style={styles.pending}>Existe uma vistoria por confirmar. O retry usa exatamente os mesmos anexos e a mesma chave.</Text>}
        {savedCheckoutInspection !== null
          ? <Text style={styles.success}>Vistoria de saída confirmada.</Text>
          : <Pressable accessibilityRole="button" disabled={sending !== null || recoveryUnavailable || (!checkoutPending && !checkoutStatusKnown)} onPress={() => void send('checkout-inspection')} style={[styles.button, (sending !== null || recoveryUnavailable || (!checkoutPending && !checkoutStatusKnown)) && styles.disabled]}>
            <Text style={styles.buttonText}>{sending === 'checkout-inspection' ? 'A registar...' : checkoutPending ? 'Tentar novamente' : 'Registar vistoria de saída'}</Text>
          </Pressable>}
      </>}
      {message !== '' && <Text style={styles.success}>{message}</Text>}
      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 17, marginTop: 16, gap: 10, borderWidth: 1, borderColor: '#E5EAF2' },
  title: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  section: { color: '#53657D', fontSize: 13, fontWeight: '800', marginTop: 10 },
  copy: { color: '#53657D', fontSize: 13, lineHeight: 19 },
  inlineState: { gap: 10, alignItems: 'flex-start' },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 5 },
  checkbox: { color: '#1769E8', fontSize: 22, width: 28 },
  item: { flex: 1, color: '#26364B', fontSize: 14, lineHeight: 19 },
  input: { minHeight: 90, borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 12, padding: 12, color: '#26364B', fontSize: 15 },
  pending: { color: '#8A5700', backgroundColor: '#FFF5D9', borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1769E8', paddingHorizontal: 12 },
  disabled: { opacity: 0.55 },
  retryButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1769E8' },
  retryText: { color: '#1769E8', fontSize: 12, fontWeight: '700' },
  buttonText: { color: '#FFF', fontWeight: '800', textAlign: 'center' },
  success: { color: '#146B3A', fontSize: 14 },
  error: { color: '#A52323', fontSize: 14, lineHeight: 20 },
})
