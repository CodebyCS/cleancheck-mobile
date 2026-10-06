import { useState } from 'react';
import TaskDetailScreen from './TaskDetailScreen';
import TasksScreen from './TasksScreen';
import { CleaningTask, mockTasks } from '../services/mockTasks';

export default function HomeScreen() {
  const [tasks, setTasks] = useState<CleaningTask[]>(mockTasks);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);

  function completeTask(taskId: string) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'CONCLUÍDA' } : task));
    setSelectedTask((current) => current?.id === taskId ? { ...current, status: 'CONCLUÍDA' } : current);
  }

  // Lista local e navegação provisória; serão substituídas pela API e navegação definitivas.
  return selectedTask
    ? <TaskDetailScreen task={selectedTask} onBack={() => setSelectedTask(null)} onComplete={completeTask} />
    : <TasksScreen tasks={tasks} onOpenTask={setSelectedTask} />;
}
