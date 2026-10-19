export type TaskStatus = 'A FAZER' | 'CONCLUÍDA';

export type CleaningTask = {
  id: string;
  property: string;
  address: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  status: TaskStatus;
  period: 'today' | 'upcoming';
};

// Dados exclusivamente fictícios enquanto a consulta real à API e a sessão não estão integradas.
export const mockTasks: CleaningTask[] = [
  {
    id: 'task-1',
    property: 'Apto Praia Ensolarada',
    address: 'R. Oceânica, 14, Apto 3A',
    date: 'Hoje',
    time: '09:00',
    duration: '2h 30min',
    type: 'Limpeza Completa',
    status: 'A FAZER',
    period: 'today',
  },
  {
    id: 'task-2',
    property: 'Estúdio Centro',
    address: 'Av. Principal, 88, 5º Andar',
    date: 'Hoje',
    time: '13:00',
    duration: '1h 30min',
    type: 'Limpeza Completa',
    status: 'A FAZER',
    period: 'today',
  },
  {
    id: 'task-3',
    property: 'Chalé Vista da Serra',
    address: 'Estr. dos Pinheiros, 7, Chalé B',
    date: 'Próxima',
    time: '10:00',
    duration: '3h',
    type: 'Limpeza Completa',
    status: 'A FAZER',
    period: 'upcoming',
  },
  {
    id: 'task-4',
    property: 'Casa do Porto',
    address: 'Av. do Cais, 2',
    date: 'Próxima',
    time: '14:30',
    duration: '2h',
    type: 'Limpeza Completa',
    status: 'A FAZER',
    period: 'upcoming',
  },
];
