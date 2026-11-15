import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import MainTabBar, { MainTab } from '../components/MainTabBar';
import { getMyTask, listMyTasks, TaskDetail, TaskListItem } from '../services/tasks';
import TaskDetailScreen from './TaskDetailScreen';
import TasksScreen from './TasksScreen';
import ProfileScreen from './ProfileScreen';
import NoticesScreen from './NoticesScreen';

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
        // Ao vir dos avisos, a lista de avisos é recarregada ao regressar ao separador.
        if (activeTab !== 'notices') void refreshTasks();
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
    const backLabel = activeTab === 'notices' ? 'Avisos' : 'Minhas Tarefas';
    if (selectedTask) return <TaskDetailScreen task={selectedTask} onBack={backToTasks} backLabel={backLabel} />;
    return (
      <View style={styles.detailState}>
        <Pressable accessibilityRole="button" onPress={backToTasks}><Text style={styles.back}>‹ {backLabel}</Text></Pressable>
        {detailLoading
          ? <ActivityIndicator color="#1769E8" size="large" />
          : <><Text style={styles.error}>{detailError}</Text><Pressable accessibilityRole="button" onPress={() => void openTask(selectedTaskId)}><Text style={styles.back}>Tentar novamente</Text></Pressable></>}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {activeTab === 'tasks' && <TasksScreen tasks={tasks} userName={session?.user.name ?? ''} onOpenTask={(task) => void openTask(task.id)} onRefresh={() => void refreshTasks()} loading={loading} error={listError} />}
      {activeTab === 'calendar' && <TasksScreen tasks={tasks} userName={session?.user.name ?? ''} onOpenTask={(task) => void openTask(task.id)} onRefresh={() => void refreshTasks()} loading={loading} error={listError} title="Agenda" showProgress={false} showPrevious={false} />}
      {activeTab === 'notices' && <NoticesScreen authenticatedFetch={authenticatedFetch} onOpenTask={(taskId) => { void openTask(taskId); }} />}
      {activeTab === 'profile' && <ProfileScreen />}
      <MainTabBar active={activeTab} onSelect={(tab) => { if ((tab === 'tasks' || tab === 'calendar') && activeTab !== tab) void refreshTasks(); setActiveTab(tab); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FC' },
  detailState: { flex: 1, padding: 20, gap: 25, backgroundColor: '#F5F8FC' },
  back: { color: '#1769E8', fontSize: 16, fontWeight: '700' },
  error: { color: '#A52323', fontSize: 16 },
});
