import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CleaningTask } from '../services/mockTasks';

type TasksScreenProps = {
  tasks: CleaningTask[];
  onOpenTask: (task: CleaningTask) => void;
  error?: string;
};

function TaskCard({ task, onPress }: { task: CleaningTask; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir tarefa em ${task.property}, ${task.date} às ${task.time}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.property}>{task.property}</Text>
        <Text style={[styles.status, task.status === 'CONCLUÍDA' && styles.statusDone]}>{task.status}</Text>
      </View>
      <Text style={styles.address}>{task.address}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{task.date} · {task.time}</Text>
        <Text style={styles.meta}>{task.duration}</Text>
      </View>
      <Text style={styles.type}>{task.type}</Text>
      <Text style={styles.open}>Ver detalhes  ›</Text>
    </Pressable>
  );
}

export default function TasksScreen({ tasks, onOpenTask, error }: TasksScreenProps) {
  const today = tasks.filter((task) => task.period === 'today');
  const upcoming = tasks.filter((task) => task.period === 'upcoming');
  const completedToday = today.filter((task) => task.status === 'CONCLUÍDA').length;

  return (
    <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>Clean&Check</Text>
          <Text style={styles.greeting}>Olá, Maria</Text>
        </View>
        <Text style={styles.testBadge}>Modo de Teste</Text>
      </View>
      <Text style={styles.date}>QUINTA, 31 DE JUL</Text>
      <Text style={styles.title}>Minhas Tarefas</Text>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Progresso de hoje</Text>
        <Text style={styles.progressValue}>{completedToday}/{today.length}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: today.length ? `${(completedToday / today.length) * 100}%` : '0%' }]} />
        </View>
      </View>

      {error ? (
        <View style={styles.messageCard}><Text style={styles.error}>{error}</Text></View>
      ) : tasks.length === 0 ? (
        <View style={styles.messageCard}><Text style={styles.emptyTitle}>Sem tarefas</Text><Text style={styles.emptyText}>Não existem tarefas atribuídas neste momento.</Text></View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Hoje</Text>
          {today.length ? today.map((task) => <TaskCard key={task.id} task={task} onPress={() => onOpenTask(task)} />) : <Text style={styles.emptyText}>Sem tarefas para hoje.</Text>}
          <Text style={styles.sectionTitle}>Próximas</Text>
          {upcoming.length ? upcoming.map((task) => <TaskCard key={task.id} task={task} onPress={() => onOpenTask(task)} />) : <Text style={styles.emptyText}>Sem tarefas futuras.</Text>}
        </>
      )}
    </ScrollView>
    <View style={styles.bottomNavigation} accessibilityRole="tablist">
      <View style={styles.navItem} accessibilityRole="tab" accessibilityState={{ selected: true }}>
        <Text style={styles.navIconActive}>✓</Text><Text style={styles.navLabelActive}>Tarefas</Text>
      </View>
      <View style={styles.navItem} accessibilityRole="tab" accessibilityState={{ disabled: true }}>
        <Text style={styles.navIcon}>▦</Text><Text style={styles.navLabel}>Agenda</Text>
      </View>
      <View style={styles.navItem} accessibilityRole="tab" accessibilityState={{ disabled: true }}>
        <Text style={styles.navIcon}>●</Text><Text style={styles.navLabel}>Avisos</Text>
      </View>
      <View style={styles.navItem} accessibilityRole="tab" accessibilityState={{ disabled: true }}>
        <Text style={styles.navIcon}>○</Text><Text style={styles.navLabel}>Perfil</Text>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FC' },
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700', marginBottom: 5 },
  greeting: { color: '#53657D', fontSize: 16 },
  testBadge: { color: '#8A5700', backgroundColor: '#FFF1C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, fontSize: 12, fontWeight: '800', overflow: 'hidden' },
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
  address: { color: '#53657D', fontSize: 15, lineHeight: 21, marginTop: 7 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 13 },
  meta: { color: '#26364B', fontSize: 14, fontWeight: '700' },
  type: { color: '#53657D', fontSize: 14, marginTop: 8 },
  open: { color: '#1769E8', fontSize: 14, fontWeight: '800', marginTop: 13 },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  error: { color: '#A52323', fontSize: 16, lineHeight: 22 },
  emptyTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#53657D', fontSize: 15, lineHeight: 21, marginBottom: 16 },
  bottomNavigation: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5EAF2', shadowColor: '#17345E', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navIcon: { color: '#8290A3', fontSize: 20, fontWeight: '700' },
  navIconActive: { color: '#1769E8', fontSize: 20, fontWeight: '800' },
  navLabel: { color: '#8290A3', fontSize: 12, fontWeight: '600' },
  navLabelActive: { color: '#1769E8', fontSize: 12, fontWeight: '800' },
});
