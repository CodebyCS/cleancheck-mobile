import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CleaningTask } from '../services/mockTasks';

type TaskDetailScreenProps = { task: CleaningTask; onBack: () => void; onComplete: (taskId: string) => void };

function VideoStep({
  sectionLabel,
  title,
  description,
  done,
  disabled,
  onRegister,
}: {
  sectionLabel: string;
  title: string;
  description: string;
  done: boolean;
  disabled: boolean;
  onRegister: () => void;
}) {
  return (
    <View>
    <Text style={styles.sectionLabel}>{sectionLabel}</Text>
    <View style={[styles.stepCard, disabled && styles.stepDisabled]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={[styles.stepState, done && styles.stepStateDone]}>{done ? 'REGISTADO' : disabled ? 'BLOQUEADO' : 'PENDENTE'}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
      <View style={styles.buttonRow}>
        <Pressable accessibilityRole="button" disabled={disabled || done} onPress={onRegister} style={({ pressed }) => [styles.secondaryButton, (disabled || done) && styles.buttonDisabled, pressed && !disabled && !done && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>{done ? 'Vídeo registado' : 'Gravar Vídeo'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={disabled || done} onPress={onRegister} style={({ pressed }) => [styles.secondaryButton, (disabled || done) && styles.buttonDisabled, pressed && !disabled && !done && styles.pressed]}>
          <Text style={styles.secondaryButtonText}>Enviar Vídeo</Text>
        </Pressable>
      </View>
    </View>
    </View>
  );
}

export default function TaskDetailScreen({ task, onBack, onComplete }: TaskDetailScreenProps) {
  const initiallyCompleted = task.status === 'CONCLUÍDA';
  const [initialVideoDone, setInitialVideoDone] = useState(initiallyCompleted);
  const [finalVideoDone, setFinalVideoDone] = useState(initiallyCompleted);
  const [completed, setCompleted] = useState(initiallyCompleted);

  const currentStage = completed ? 3 : finalVideoDone ? 2 : initialVideoDone ? 1 : 0;

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}><Text style={styles.back}>‹ Minhas Tarefas</Text></Pressable>
        <Text style={styles.testBadge}>Modo de Teste</Text>
      </View>

      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.eyebrow}>Detalhe da tarefa</Text>
          <Text style={styles.title}>{task.property}</Text>
          <Text style={styles.address}>{task.address}</Text>
        </View>
        <Text style={[styles.status, completed && styles.statusDone]}>{completed ? 'CONCLUÍDA' : 'A FAZER'}</Text>
      </View>

      <View style={styles.infoCard}>
        <View><Text style={styles.infoLabel}>Data e hora</Text><Text style={styles.infoValue}>{task.date} · {task.time}</Text></View>
        <View><Text style={styles.infoLabel}>Duração</Text><Text style={styles.infoValue}>{task.duration}</Text></View>
        <View><Text style={styles.infoLabel}>Tipo</Text><Text style={styles.infoValue}>{task.type}</Text></View>
      </View>

      <View style={styles.timeline} accessibilityLabel="Progresso da tarefa">
        {['Início', 'Final', 'Pronto'].map((label, index) => (
          <View key={label} style={styles.timelineItem}>
            <View style={[styles.timelineDot, index <= currentStage && styles.timelineDotActive]} />
            <Text style={[styles.timelineLabel, index <= currentStage && styles.timelineLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.notice}><Text style={styles.noticeText}>Este fluxo é uma simulação. Os botões não abrem a câmara nem enviam ficheiros.</Text></View>

      <VideoStep sectionLabel="1. ANTES DA LIMPEZA" title="Vídeo Inicial" description="Regista o estado do imóvel antes de começar a limpeza." done={initialVideoDone} disabled={completed} onRegister={() => setInitialVideoDone(true)} />
      <VideoStep sectionLabel="2. DEPOIS DA LIMPEZA" title="Vídeo Final" description="Regista o estado do imóvel depois de terminares a limpeza." done={finalVideoDone} disabled={!initialVideoDone || completed} onRegister={() => setFinalVideoDone(true)} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !initialVideoDone || !finalVideoDone || completed }}
        disabled={!initialVideoDone || !finalVideoDone || completed}
        onPress={() => {
          setCompleted(true);
          onComplete(task.id);
        }}
        style={({ pressed }) => [styles.completeButton, (!initialVideoDone || !finalVideoDone || completed) && styles.completeButtonDisabled, pressed && styles.pressed]}
      >
        <Text style={styles.completeButtonText}>{completed ? 'TAREFA CONCLUÍDA' : 'CONCLUIR TAREFA'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40, backgroundColor: '#F5F8FC' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 22 },
  back: { color: '#1769E8', fontSize: 16, fontWeight: '700' },
  testBadge: { color: '#8A5700', backgroundColor: '#FFF1C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
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
});
