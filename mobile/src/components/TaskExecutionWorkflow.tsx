import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import TaskEvidenceUploader from './TaskEvidenceUploader'
import { createIdempotencyKey } from '../services/taskImpediments'
import {
  submitMyTaskCheckoutInspection,
  submitMyTaskExecution,
  getMyTaskCheckoutInspection,
  listMyTaskExecutions,
  TaskExecutionError,
  type AuthenticatedFetch,
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

const CHECKLIST_ITEMS = [
  'Cama(s) refeita(s) com roupa limpa',
  'Casa de banho limpa e desinfetada',
  'Cozinha limpa, louça guardada',
  'Chão aspirado e lavado',
  'Janelas e superfícies limpas',
  'Eletrodomésticos limpos',
  'Lixo retirado e sacos novos colocados',
  'Amenities reabastecidos (sabão, champô, papel)',
  'Toalhas trocadas e dobradas',
  'Cofre/chave verificado e funcional',
]

type Props = { taskId: number; userId: number | string; authenticatedFetch: AuthenticatedFetch; checkoutCleaning: boolean }

function makeSubmission(responses: TaskExecutionSubmission['responses'], observations: string | null, evidenceIds: number[]): TaskExecutionSubmission {
  return { idempotency_key: createIdempotencyKey(), responses, observations, evidence_ids: evidenceIds }
}

export default function TaskExecutionWorkflow({ taskId, userId, authenticatedFetch, checkoutCleaning }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
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
        const restored: Record<string, boolean> = {}
        for (const response of execution.submission.responses) {
          if (typeof response.value === 'boolean') restored[response.key] = response.value
        }
        setChecked(restored)
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

  function toggleItem(label: string) {
    if (pending.execution || sending) return
    setChecked((current) => ({ ...current, [label]: !current[label] }))
    setMessage('')
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
          ? makeSubmission(CHECKLIST_ITEMS.map((key) => ({ key, value: checked[key] === true })), observations.trim() || null, beforeEvidence)
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
      <Text style={styles.copy}>As respostas usam os itens documentados no protótipo. A API guarda cada item como uma resposta key/value e não define um catálogo próprio.</Text>
      <Text style={styles.section}>Antes da limpeza</Text>
      <TaskEvidenceUploader taskId={taskId} authenticatedFetch={authenticatedFetch} phaseLabel="Prova anterior" disabled={executionPending || executionSaved} onUploaded={(evidence) => {
        setBeforeEvidence((current) => current.includes(evidence.id) ? current : [...current, evidence.id])
      }} />
      {beforeEvidence.length > 0 && <Text style={styles.copy}>{beforeEvidence.length === 1 ? '1 ficheiro confirmado para associar.' : `${beforeEvidence.length} ficheiros confirmados para associar.`}</Text>}

      <Text style={styles.section}>Checklist da limpeza</Text>
      {CHECKLIST_ITEMS.map((item) => (
        <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: checked[item] === true, disabled: executionPending || executionSaved || sending !== null }} disabled={executionPending || executionSaved || sending !== null} onPress={() => toggleItem(item)} style={styles.checkRow}>
          <Text style={styles.checkbox}>{checked[item] ? '☑' : '☐'}</Text><Text style={styles.item}>{item}</Text>
        </Pressable>
      ))}
      <TextInput accessibilityLabel="Observações da execução" value={observations} onChangeText={setObservations} editable={!executionPending && !executionSaved && sending === null} maxLength={5000} multiline textAlignVertical="top" placeholder="Observações (opcional)" style={styles.input} />
      {executionPending && <Text style={styles.pending}>Existe uma execução por confirmar. O retry usa exatamente as mesmas respostas, evidências e chave.</Text>}
      {executionSaved
        ? <><Text style={styles.success}>Execução confirmada pela API.</Text><Pressable accessibilityRole="button" onPress={() => {
          setSavedExecutionId(null); setChecked({}); setObservations(''); setBeforeEvidence([]); setMessage('')
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
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 5 },
  checkbox: { color: '#1769E8', fontSize: 22, width: 28 },
  item: { flex: 1, color: '#26364B', fontSize: 14, lineHeight: 19 },
  input: { minHeight: 90, borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 12, padding: 12, color: '#26364B', fontSize: 15 },
  pending: { color: '#8A5700', backgroundColor: '#FFF5D9', borderRadius: 10, padding: 10, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1769E8', paddingHorizontal: 12 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#FFF', fontWeight: '800', textAlign: 'center' },
  success: { color: '#146B3A', fontSize: 14 },
  error: { color: '#A52323', fontSize: 14, lineHeight: 20 },
})
