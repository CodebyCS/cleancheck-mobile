import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import MainTabBar, { MainTab } from '../components/MainTabBar';
import { getMyTask, listMyTasks, TaskDetail, TaskListItem } from '../services/tasks';
import TaskDetailScreen from './TaskDetailScreen';
import TasksScreen from './TasksScreen';
import ProfileScreen from './ProfileScreen';

function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.placeholderPage}>
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.placeholderCard}><Text style={styles.placeholderText}>{message}</Text></View>
    </View>
  );
}

export default function HomeScreen() {
  const { authenticatedFetch, session } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('tasks');
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const refreshTasks = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    setListError(null);
    try {
      const data = await listMyTasks(authenticatedFetch);
      if (listRequest.current === request) setTasks(data);
    } catch (error) {
      if (listRequest.current === request) {
        setTasks([]);
        setListError(error instanceof Error ? error.message : 'Não foi possível carregar as tarefas.');
      }
    } finally {
      if (listRequest.current === request) setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void refreshTasks();
    return () => { listRequest.current++; detailRequest.current++; };
  }, [refreshTasks]);

  async function openTask(taskId: number) {
    const request = ++detailRequest.current;
    setSelectedTaskId(taskId);
    setSelectedTask(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const detail = await getMyTask(taskId, authenticatedFetch);
      if (detailRequest.current === request) setSelectedTask(detail);
    } catch (error) {
      if (detailRequest.current === request) {
        setDetailError(error instanceof Error ? error.message : 'Não foi possível abrir esta tarefa.');
        // A tarefa pode ter sido reatribuída desde a última consulta.
        void refreshTasks();
      }
    } finally {
      if (detailRequest.current === request) setDetailLoading(false);
    }
  }

  function backToTasks() {
    detailRequest.current++;
    setSelectedTaskId(null);
    setSelectedTask(null);
    setDetailError(null);
    void refreshTasks();
  }

  if (selectedTaskId !== null) {
    if (selectedTask) return <TaskDetailScreen task={selectedTask} onBack={backToTasks} />;
    return (
      <View style={styles.detailState}>
        <Pressable accessibilityRole="button" onPress={backToTasks}><Text style={styles.back}>‹ Minhas Tarefas</Text></Pressable>
        {detailLoading
          ? <ActivityIndicator color="#1769E8" size="large" />
          : <><Text style={styles.error}>{detailError}</Text><Pressable accessibilityRole="button" onPress={() => void openTask(selectedTaskId)}><Text style={styles.back}>Tentar novamente</Text></Pressable></>}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {activeTab === 'tasks' && <TasksScreen tasks={tasks} userName={session?.user.name ?? ''} onOpenTask={(task) => void openTask(task.id)} onRefresh={() => void refreshTasks()} loading={loading} error={listError} />}
      {activeTab === 'calendar' && <PlaceholderScreen title="Agenda" message="A agenda será ligada à API numa próxima fase." />}
      {activeTab === 'notices' && <PlaceholderScreen title="Avisos" message="Ainda não existem avisos disponíveis." />}
      {activeTab === 'profile' && <ProfileScreen />}
      <MainTabBar active={activeTab} onSelect={(tab) => { if (tab === 'tasks' && activeTab !== 'tasks') void refreshTasks(); setActiveTab(tab); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FC' },
  detailState: { flex: 1, padding: 20, gap: 25, backgroundColor: '#F5F8FC' },
  back: { color: '#1769E8', fontSize: 16, fontWeight: '700' },
  error: { color: '#A52323', fontSize: 16 },
  placeholderPage: { flex: 1, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 20 },
  placeholderCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  placeholderText: { color: '#53657D', fontSize: 16, lineHeight: 23 },
});
