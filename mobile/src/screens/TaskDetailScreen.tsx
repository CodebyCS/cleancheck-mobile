import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import { taskDateLabel, taskStatusLabel, taskTypeLabel, TaskDetail } from '../services/tasks';
import { useAuth } from '../auth/AuthContext';
import { getMyTask, startMyTask, updateMyTaskNotes, completeMyTask } from "../services/tasks";

type TaskDetailScreenProps = { task: TaskDetail; onBack: () => void; backLabel?: string };

export default function TaskDetailScreen({ task, onBack, backLabel = 'Minhas Tarefas' }: TaskDetailScreenProps) {
  const [currentTask, setCurrentTask] = useState(task);
  const alreadyCompleted = currentTask.status === 'completed';

  const [providerNotes, setProviderNotes] = useState(task.provider_notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState('');

  const [completing, setCompleting] = useState(false);

  const { authenticatedFetch } = useAuth();
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleStart() {
    setStarting(true);
    setActionError('');

    try {
      await startMyTask(currentTask.id, authenticatedFetch);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível iniciar a tarefa.',
      );
      setStarting(false);
      return;
    }

    try {
      setCurrentTask(await getMyTask(currentTask.id, authenticatedFetch));
    } catch {
      setActionError(
        'A API iniciou a tarefa, mas não foi possível atualizar os dados exibidos. Volte à lista e tente novamente.',
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSaveNotes() {
  setSavingNotes(true);
  setActionError('');
  setNotesMessage('');

    try {
      const notes = providerNotes.trim() === '' ? null : providerNotes;

      await updateMyTaskNotes(currentTask.id, notes, authenticatedFetch);
      setCurrentTask(await getMyTask(currentTask.id, authenticatedFetch));
      setNotesMessage('Notas guardadas.');
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível guardar as notas.',
      );
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setActionError('');

    try {
      await completeMyTask(currentTask.id, authenticatedFetch);
      setCurrentTask(await getMyTask(currentTask.id, authenticatedFetch));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível concluir a tarefa.',
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}><Text style={styles.back}>‹ {backLabel}</Text></Pressable>
      </View>

      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.eyebrow}>Detalhe da tarefa</Text>
          <Text style={styles.title}>{currentTask.property ?? 'Imóvel sem nome'}</Text>
          <Text style={styles.address}>{currentTask.address ?? 'Morada não disponível'}</Text>
        </View>
        <Text style={[styles.status, alreadyCompleted && styles.statusDone]}>{taskStatusLabel(currentTask.status)}</Text>
      </View>

      <View style={styles.infoCard}>
        <View><Text style={styles.infoLabel}>Data e hora</Text><Text style={styles.infoValue}>{taskDateLabel(currentTask.scheduled_start_at)}</Text></View>
        <View><Text style={styles.infoLabel}>Prazo</Text><Text style={styles.infoValue}>{taskDateLabel(currentTask.scheduled_end_at)}</Text></View>
        <View><Text style={styles.infoLabel}>Tipo</Text><Text style={styles.infoValue}>{taskTypeLabel(currentTask.type)}</Text></View>
        {currentTask.started_at && <View><Text style={styles.infoLabel}>Início registado</Text><Text style={styles.infoValue}>{taskDateLabel(currentTask.started_at)}</Text></View>}
        {currentTask.completed_at && <View><Text style={styles.infoLabel}>Conclusão registada</Text><Text style={styles.infoValue}>{taskDateLabel(currentTask.completed_at)}</Text></View>}
      </View>

      {currentTask.status === 'in_progress' && (
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>Notas do prestador</Text>
          <TextInput
            accessibilityLabel="Notas do prestador"
            value={providerNotes}
            onChangeText={setProviderNotes}
            placeholder="Ex.: apartamento muito sujo; copo quebrado."
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={styles.notesInput}
          />
          <Pressable
            accessibilityRole="button"
            disabled={savingNotes || starting}
            onPress={() => void handleSaveNotes()}
            style={({ pressed }) => [
              styles.secondaryButton,
              (savingNotes || starting) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {savingNotes ? 'A guardar...' : 'Guardar notas'}
            </Text>
          </Pressable>
          {notesMessage !== '' && (
            <Text style={styles.notesMessage}>{notesMessage}</Text>
          )}
        </View>
      )}

      {currentTask.status === 'in_progress' && (
        <>
          <Text style={styles.mediaNotice}>
            A conclusão não exige mídia. O envio de arquivos de prova ainda não está disponível na API.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={completing || savingNotes || starting}
            onPress={() => void handleComplete()}
            style={({ pressed }) => [
              styles.completeButton,
              (completing || savingNotes || starting) && styles.completeButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.completeButtonText}>
              {completing ? 'A concluir...' : 'Concluir tarefa'}
            </Text>
          </Pressable>
        </>
      )}

      {actionError !== '' && (
        <Text style={styles.actionError}>{actionError}</Text>
      )}

      {currentTask.status === 'pending' && (
        <Pressable
          accessibilityRole="button"
          disabled={starting}
          onPress={() => void handleStart()}
          style={({ pressed }) => [
            styles.completeButton,
            starting && styles.completeButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.completeButtonText}>
            {starting ? 'A iniciar...' : 'Iniciar tarefa'}
          </Text>
        </Pressable>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, backgroundColor: '#F5F8FC' },
  topRow: { flexDirection: 'row', marginBottom: 22 },
  back: { color: '#1769E8', fontSize: 16, fontWeight: '700' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  headingText: { flex: 1 },
  eyebrow: { color: '#1769E8', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  title: { color: '#172B4D', fontSize: 27, fontWeight: '800' },
  address: { color: '#53657D', fontSize: 15, lineHeight: 21, marginTop: 7 },
  status: { color: '#8A5700', backgroundColor: '#FFF1C7', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  statusDone: { color: '#146B3A', backgroundColor: '#DFF5E7' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 14, borderWidth: 1, borderColor: '#E5EAF2' },
  infoLabel: { color: '#8290A3', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { color: '#26364B', fontSize: 16, fontWeight: '700', marginTop: 3 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 24, paddingHorizontal: 8 },
  timelineItem: { alignItems: 'center', gap: 7, flex: 1 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#D8E0EB', borderWidth: 3, borderColor: '#FFFFFF' },
  timelineDotActive: { backgroundColor: '#1769E8' },
  timelineLabel: { color: '#8290A3', fontSize: 13, fontWeight: '700' },
  timelineLabelActive: { color: '#1769E8' },
  notice: { backgroundColor: '#E7F0FF', borderRadius: 14, padding: 14, marginBottom: 15 },
  noticeText: { color: '#315A92', fontSize: 14, lineHeight: 20 },
  sectionLabel: { color: '#53657D', fontSize: 13, fontWeight: '800', letterSpacing: 0.6, marginTop: 5, marginBottom: 8 },
  stepCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: '#E5EAF2' },
  stepDisabled: { opacity: 0.55 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stepTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  stepState: { color: '#8A5700', fontSize: 11, fontWeight: '800' },
  stepStateDone: { color: '#146B3A' },
  stepDescription: { color: '#53657D', fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 14 },
  buttonRow: { flexDirection: 'row', gap: 9 },
  secondaryButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#1769E8', paddingHorizontal: 8 },
  secondaryButtonText: { color: '#1769E8', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  buttonDisabled: { borderColor: '#AEB9C8', backgroundColor: '#F1F3F6' },
  completeButton: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#1769E8', marginTop: 5 },
  completeButtonDisabled: { backgroundColor: '#A9C7F4' },
  completeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  actionError: {color: '#A52323', fontSize: 14, marginTop: 14},
  notesInput: { minHeight: 90, borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 12, padding: 12, color: '#26364B',fontSize: 15, marginTop: 10, marginBottom: 12,},
  notesMessage: { color: '#146B3A', fontSize: 14, marginTop: 10 },
  mediaNotice: { color: '#53657D', fontSize: 13, lineHeight: 19, marginTop: 16 },
});
