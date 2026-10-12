import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MainTabBar, { MainTab } from '../components/MainTabBar';
import TaskDetailScreen from './TaskDetailScreen';
import TasksScreen from './TasksScreen';
import ProfileScreen from './ProfileScreen';
import { CleaningTask, mockTasks } from '../services/mockTasks';

function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.placeholderPage}>
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>{message}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [tasks, setTasks] = useState<CleaningTask[]>(mockTasks);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('tasks');

  function completeTask(taskId: string) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'CONCLUÍDA' } : task));
    setSelectedTask((current) => current?.id === taskId ? { ...current, status: 'CONCLUÍDA' } : current);
  }

  if (selectedTask) {
    return <TaskDetailScreen task={selectedTask} onBack={() => setSelectedTask(null)} onComplete={completeTask} />;
  }

  return (
    <View style={styles.screen}>
      {activeTab === 'tasks' && <TasksScreen tasks={tasks} onOpenTask={setSelectedTask} />}
      {activeTab === 'calendar' && <PlaceholderScreen title="Agenda" message="A agenda será ligada à API numa próxima fase." />}
      {activeTab === 'notices' && <PlaceholderScreen title="Avisos" message="Ainda não existem avisos disponíveis." />}
      {activeTab === 'profile' && <ProfileScreen />}
      <MainTabBar active={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8FC' },
  placeholderPage: { flex: 1, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 20 },
  placeholderCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#E5EAF2' },
  placeholderText: { color: '#53657D', fontSize: 16, lineHeight: 23 },
});
