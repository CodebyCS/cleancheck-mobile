import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  createIdempotencyKey,
  registerTaskImpediment,
  TaskImpedimentError,
  TaskImpedimentFieldErrors,
  TaskImpedimentSubmission,
} from '../services/taskImpediments';
import {
  getPendingTaskImpediment,
  PendingTaskImpediment,
  removePendingTaskImpediment,
  savePendingTaskImpediment,
} from '../services/pendingTaskImpediments';

type TaskImpedimentFormProps = { taskId: number };

export default function TaskImpedimentForm({ taskId }: TaskImpedimentFormProps) {
  const { authenticatedFetch, session } = useAuth();
  const userId = session?.user.id;
  const isProvider = session?.user.role === 'service_provider';
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingTaskImpediment | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TaskImpedimentFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [conflictNeedsReset, setConflictNeedsReset] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setStorageReady(false);
    setStorageError(null);

    if (userId === undefined) {
      setStorageReady(true);
      return () => { active = false; };
    }

    void getPendingTaskImpediment(taskId, userId).then((draft) => {
      if (!active) return;
      setPending(draft);
      if (draft) {
        setReason(draft.submission.reason);
        setDescription(draft.submission.description ?? '');
      } else {
        setReason('');
        setDescription('');
      }
      setStorageReady(true);
    }).catch(() => {
      if (!active) return;
      setStorageError('Não foi possível verificar envios pendentes. Tenta novamente antes de criar outro impedimento.');
    });

    return () => { active = false; };
  }, [taskId, userId]);

  if (!isProvider) return null;

  async function reloadPending() {
    if (userId === undefined) return;
    setStorageReady(false);
    setStorageError(null);
    try {
      const draft = await getPendingTaskImpediment(taskId, userId);
      setPending(draft);
      if (draft) {
        setReason(draft.submission.reason);
        setDescription(draft.submission.description ?? '');
      }
      setStorageReady(true);
    } catch {
      setStorageError('Não foi possível verificar envios pendentes. Tenta novamente antes de criar outro impedimento.');
    }
  }

  async function clearPending(): Promise<boolean> {
    if (userId === undefined) return false;
    try {
      await removePendingTaskImpediment(taskId, userId);
      setPending(null);
      setConflictNeedsReset(false);
      return true;
    } catch {
      setStorageError('Não foi possível limpar o envio guardado. Repete a ação para confirmar e limpar com segurança.');
      return false;
    }
  }

  async function submit() {
    if (!storageReady || storageError || sending || submittingRef.current || userId === undefined) return;

    const normalizedReason = reason.trim();
    const normalizedDescription = description.trim();
    const nextFieldErrors: TaskImpedimentFieldErrors = {};
    if (!normalizedReason) nextFieldErrors.reason = 'Indica o motivo do impedimento.';
    if (normalizedReason.length > 120) nextFieldErrors.reason = 'O motivo não pode exceder 120 caracteres.';
    if (normalizedDescription.length > 2000) nextFieldErrors.description = 'A descrição não pode exceder 2000 caracteres.';
    setFieldErrors(nextFieldErrors);
    setError(null);
    setSuccess(null);
    if (Object.keys(nextFieldErrors).length > 0) return;

    submittingRef.current = true;
    setSending(true);
    setStorageError(null);
    let operation = pending;
    try {
      if (!operation) {
        operation = {
          taskId,
          userId,
          submission: {
            reason: normalizedReason,
            description: normalizedDescription || null,
            idempotency_key: createIdempotencyKey(),
          },
        };
        try {
          // Persist the exact body and key before sending, so a restart or lost
          // response can safely retry the same operation.
          await savePendingTaskImpediment(operation);
          setPending(operation);
        } catch {
          setStorageError('Não foi possível guardar a chave segura do envio. O pedido não foi enviado.');
          return;
        }
      }

      const result = await registerTaskImpediment(taskId, operation.submission, authenticatedFetch);
      setSuccess(result.repeated ? 'Este impedimento já estava registado.' : 'Impedimento registado com sucesso.');
      setFieldErrors({});
      if (await clearPending()) {
        setReason('');
        setDescription('');
      }
    } catch (caught) {
      const taskError = caught instanceof TaskImpedimentError
        ? caught
        : new TaskImpedimentError('NETWORK', 'Não foi possível confirmar o envio. Tenta novamente.');
      setError(taskError.message);
      setFieldErrors(taskError.fieldErrors);

      // These responses definitively reject the request, so an edited form
      // can start a new operation with a fresh idempotency key.
      if (taskError.code === 'VALIDATION' || taskError.code === 'FORBIDDEN' || taskError.code === 'NOT_FOUND') {
        if (await clearPending()) setSuccess(null);
      }
      if (taskError.code === 'CONFLICT') setConflictNeedsReset(true);
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  function startNewAfterConflict() {
    Alert.alert(
      'Criar novo registo?',
      'A chave atual já está associada a outros dados. Uma nova chave pode criar outro impedimento. Continua apenas se pretendes mesmo criar um novo registo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Criar novo registo',
          style: 'destructive',
          onPress: () => { void clearPending().then((cleared) => { if (cleared) setError(null); }); },
        },
      ],
    );
  }

  const inputsLocked = !!pending || sending || !storageReady || !!storageError;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>COMUNICAR IMPEDIMENTO</Text>
      <Text style={styles.help}>Regista um problema que esteja a impedir a realização desta tarefa.</Text>

      {storageReady && pending && (
        <Text style={styles.pendingNotice}>
          Existe um envio por confirmar. Mantivemos os mesmos dados e a mesma chave para o retry não criar duplicados.
        </Text>
      )}
      {storageError && <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text>}
      {!storageReady && !storageError && <ActivityIndicator accessibilityLabel="A verificar envio pendente" color="#1769E8" />}
      {storageError && <Pressable accessibilityRole="button" onPress={() => void reloadPending()} style={styles.textButton}><Text style={styles.textButtonLabel}>Tentar novamente</Text></Pressable>}

      {storageReady && !storageError && <>
        <Text style={styles.label}>Motivo *</Text>
        <TextInput
          accessibilityLabel="Motivo do impedimento"
          value={reason}
          onChangeText={(value) => { setReason(value); setFieldErrors((current) => ({ ...current, reason: undefined })); setError(null); }}
          editable={!inputsLocked}
          maxLength={120}
          placeholder="Descreve o motivo"
          style={[styles.input, fieldErrors.reason && styles.inputError, inputsLocked && styles.inputDisabled]}
          returnKeyType="next"
        />
        {fieldErrors.reason && <Text accessibilityRole="alert" style={styles.fieldError}>{fieldErrors.reason}</Text>}
        <Text style={styles.counter}>{reason.length}/120</Text>

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          accessibilityLabel="Descrição do impedimento, opcional"
          value={description}
          onChangeText={(value) => { setDescription(value); setFieldErrors((current) => ({ ...current, description: undefined })); setError(null); }}
          editable={!inputsLocked}
          maxLength={2000}
          multiline
          numberOfLines={4}
          placeholder="Acrescenta contexto, se necessário"
          style={[styles.input, styles.multiline, fieldErrors.description && styles.inputError, inputsLocked && styles.inputDisabled]}
          textAlignVertical="top"
        />
        {fieldErrors.description && <Text accessibilityRole="alert" style={styles.fieldError}>{fieldErrors.description}</Text>}
        <Text style={styles.counter}>{description.length}/2000</Text>

        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {success && <Text accessibilityRole="status" style={styles.success}>{success}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: sending || !storageReady || !!storageError }}
          disabled={sending || !storageReady || !!storageError}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.submitButton, sending && styles.submitDisabled, pressed && !sending && styles.pressed]}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitLabel}>{pending ? 'Tentar novamente' : 'Registar impedimento'}</Text>}
        </Pressable>
        {conflictNeedsReset && <Pressable accessibilityRole="button" onPress={startNewAfterConflict} style={styles.textButton}><Text style={styles.textButtonLabel}>Iniciar novo envio</Text></Pressable>}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, marginTop: 18, borderWidth: 1, borderColor: '#E5EAF2' },
  sectionLabel: { color: '#53657D', fontSize: 13, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  help: { color: '#53657D', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  pendingNotice: { color: '#73500A', backgroundColor: '#FFF5D6', borderRadius: 10, padding: 11, marginBottom: 12, fontSize: 13, lineHeight: 18 },
  label: { color: '#26364B', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#C8D3E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#172B4D', backgroundColor: '#FFFFFF', fontSize: 15 },
  multiline: { minHeight: 94 },
  inputError: { borderColor: '#A52323' },
  inputDisabled: { backgroundColor: '#F2F4F7', color: '#53657D' },
  counter: { color: '#8290A3', fontSize: 11, textAlign: 'right', marginTop: 3 },
  fieldError: { color: '#A52323', fontSize: 12, marginTop: 4 },
  error: { color: '#A52323', fontSize: 14, lineHeight: 20, marginTop: 10 },
  success: { color: '#146B3A', fontSize: 14, lineHeight: 20, marginTop: 10 },
  submitButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1769E8', marginTop: 14, paddingHorizontal: 12 },
  submitDisabled: { opacity: 0.7 },
  submitLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  textButton: { alignSelf: 'center', padding: 10, marginTop: 6 },
  textButtonLabel: { color: '#1769E8', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
