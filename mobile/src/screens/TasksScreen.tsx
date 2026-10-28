import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isToday, taskDateLabel, taskStatusLabel, taskTypeLabel, TaskListItem } from '../services/tasks';

type TasksScreenProps = {
  tasks: TaskListItem[];
  userName: string;
  onOpenTask: (task: TaskListItem) => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
};

function TaskCard({ task, onPress }: { task: TaskListItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir tarefa em ${task.property ?? 'imóvel sem nome'}, ${taskDateLabel(task.scheduled_start_at)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.property}>{task.property ?? 'Imóvel sem nome'}</Text>
        <Text style={[styles.status, task.status === 'completed' && styles.statusDone]}>{taskStatusLabel(task.status)}</Text>
      </View>
      <Text style={styles.meta}>{taskDateLabel(task.scheduled_start_at)}</Text>
      <Text style={styles.type}>{taskTypeLabel(task.type)}</Text>
      <Text style={styles.open}>Ver detalhes  ›</Text>
    </Pressable>
  );
}

export default function TasksScreen({ tasks, userName, onOpenTask, onRefresh, loading, error }: TasksScreenProps) {
  const now = new Date();
  const today = tasks.filter((task) => isToday(task.scheduled_start_at, now));
  const upcoming = tasks.filter((task) => new Date(task.scheduled_start_at).getTime() > now.getTime() && !isToday(task.scheduled_start_at, now));
  const previous = tasks.filter((task) => new Date(task.scheduled_start_at).getTime() < now.getTime() && !isToday(task.scheduled_start_at, now));
  const completedToday = today.filter((task) => task.status === 'completed').length;

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>Clean&Check</Text>
          <Text style={styles.greeting}>Olá, {userName}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onRefresh} disabled={loading} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>
      <Text style={styles.date}>{new Intl.DateTimeFormat('pt-PT', { dateStyle: 'full' }).format(now).toUpperCase()}</Text>
      <Text style={styles.title}>Minhas Tarefas</Text>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Progresso de hoje</Text>
        <Text style={styles.progressValue}>{completedToday}/{today.length}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: today.length ? `${(completedToday / today.length) * 100}%` : '0%' }]} />
        </View>
      </View>
      {loading ? (
        <View style={styles.messageCard}><ActivityIndicator color="#1769E8" /><Text style={styles.emptyText}>A carregar tarefas...</Text></View>
      ) : error ? (
        <View style={styles.messageCard}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={onRefresh}><Text style={styles.open}>Tentar novamente</Text></Pressable></View>
      ) : tasks.length === 0 ? (
        <View style={styles.messageCard}><Text style={styles.emptyTitle}>Sem tarefas</Text><Text style={styles.emptyText}>Não existem tarefas atribuídas neste momento.</Text></View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Hoje</Text>
          {today.length ? today.map((task) => <TaskCard key={task.id} task={task} onPress={() => onOpenTask(task)} />) : <Text style={styles.emptyText}>Sem tarefas para hoje.</Text>}
          <Text style={styles.sectionTitle}>Próximas</Text>
          {upcoming.length ? upcoming.map((task) => <TaskCard key={task.id} task={task} onPress={() => onOpenTask(task)} />) : <Text style={styles.emptyText}>Sem tarefas futuras.</Text>}
          {previous.length > 0 && <Text style={styles.sectionTitle}>Anteriores</Text>}
          {previous.map((task) => <TaskCard key={task.id} task={task} onPress={() => onOpenTask(task)} />)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700', marginBottom: 5 },
  greeting: { color: '#53657D', fontSize: 16 },
  refreshButton: { paddingHorizontal: 8, paddingVertical: 7 },
  refreshText: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  date: { color: '#8290A3', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 22 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginTop: 5, marginBottom: 16 },
  progressCard: { backgroundColor: '#1769E8', borderRadius: 18, padding: 18, marginBottom: 24 },
  progressLabel: { color: '#E7F0FF', fontSize: 15, fontWeight: '600' },
  progressValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginVertical: 6 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#6FA2EE', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF' },
  sectionTitle: { color: '#172B4D', fontSize: 20, fontWeight: '800', marginBottom: 10, marginTop: 2 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: '#E5EAF2', shadowColor: '#17345E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  pressed: { opacity: 0.78 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  property: { flex: 1, color: '#172B4D', fontSize: 18, fontWeight: '800' },
  status: { color: '#8A5700', backgroundColor: '#FFF1C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  statusDone: { color: '#146B3A', backgroundColor: '#DFF5E7' },
  meta: { color: '#26364B', fontSize: 14, fontWeight: '700', marginTop: 13 },
  type: { color: '#53657D', fontSize: 14, marginTop: 8 },
  open: { color: '#1769E8', fontSize: 14, fontWeight: '800', marginTop: 13 },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  error: { color: '#A52323', fontSize: 16, lineHeight: 22 },
  emptyTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#53657D', fontSize: 15, lineHeight: 21, marginBottom: 16 },
});
