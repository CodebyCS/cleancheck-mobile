import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthenticatedFetch } from '../services/tasks';
import { BookingNotice, formatDay, listBookingNotices, markNoticeAsRead, NoticeType } from '../services/notices';
import { useAppForeground } from '../hooks/useAppForeground';

type NoticesScreenProps = {
  authenticatedFetch: AuthenticatedFetch;
  onOpenTask: (taskId: number) => void;
};

const noticeTitles: Record<NoticeType, string> = {
  booking_updated: 'Reserva alterada',
  booking_cancelled: 'Reserva cancelada',
  task_assigned: 'Nova tarefa atribuída',
  task_unassigned: 'Tarefa reatribuída',
  task_cancelled: 'Tarefa cancelada',
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function noticeMessage(notice: BookingNotice): string {
  const stay = `${formatDay(notice.booking.checkIn)} — ${formatDay(notice.booking.checkOut)}`;
  const start = notice.task?.scheduledStart ? dateLabel(notice.task.scheduledStart) : null;

  switch (notice.type) {
    case 'booking_updated':
      return `Novas datas: ${stay}`;
    case 'booking_cancelled':
      return `Reserva cancelada: ${stay}`;
    case 'task_assigned':
      return start ? `Agendada para ${start}` : `Estadia: ${stay}`;
    case 'task_unassigned':
      return start ? `A tarefa de ${start} passou para outro prestador.` : 'A tarefa passou para outro prestador.';
    case 'task_cancelled':
      return start ? `A tarefa de ${start} foi cancelada.` : 'A tarefa foi cancelada.';
  }
}

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

type NoticeCardProps = {
  notice: BookingNotice;
  busy: boolean;
  onOpenTask: () => void;
  onMarkRead: () => void;
};

function NoticeCard({ notice, busy, onOpenTask, onMarkRead }: NoticeCardProps) {
  const canOpenTask = notice.task !== null && notice.task.available;

    // These types already say why the task is gone; the generic line would repeat it.
  const explainedByMessage = notice.type === 'task_unassigned' || notice.type === 'task_cancelled';

  return (
    <View style={[styles.card, !notice.read && styles.cardUnread]}>
      <View style={styles.cardHeading}>
        <Text style={styles.cardTitle}>{noticeTitles[notice.type]}</Text>
        {!notice.read && <Text style={styles.unread}>NOVO</Text>}
      </View>
      <Text style={styles.property}>{notice.property.name}</Text>
      <Text style={styles.message}>{noticeMessage(notice)}</Text>
      <Text style={styles.timestamp}>Recebido {dateLabel(notice.notifiedAt)}</Text>
      {notice.task === null ? (
        <Text style={styles.unavailable}>Este aviso não está associado a uma tarefa.</Text>
      ) : !notice.task.available && !explainedByMessage && (
        <Text style={styles.unavailable}>A tarefa já não está disponível para a tua conta.</Text>
      )}
      {busy ? (
        <ActivityIndicator color="#1769E8" style={styles.busy} />
      ) : (
        <View style={styles.actions}>
          {canOpenTask && (
            <Pressable accessibilityRole="button" onPress={onOpenTask} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
              <Text style={styles.openText}>Abrir tarefa atual ›</Text>
            </Pressable>
          )}
          {!notice.read && !canOpenTask && (
            <Pressable accessibilityRole="button" onPress={onMarkRead} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
              <Text style={styles.openText}>Marcar como lido</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function NoticesScreen({ authenticatedFetch, onOpenTask }: NoticesScreenProps) {
  const [notices, setNotices] = useState<BookingNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++request.current;
    setError(null);
    setActionError(null);
    try {
      const result = await listBookingNotices(authenticatedFetch);
      if (request.current !== currentRequest) return;
      setNotices(result.notices);
      setUnreadCount(result.unreadCount);
      setPage(result.currentPage);
      setLastPage(result.lastPage);
    } catch (cause) {
      // The list already shown stays on screen; only the message changes.
      if (request.current === currentRequest) setError(messageOf(cause, 'Não foi possível carregar os avisos.'));
    } finally {
      if (request.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]);

  // Back from the background: notices may have arrived while the app was away.
  useAppForeground(() => {
    void refresh();
  });

  function pullToRefresh() {
    setRefreshing(true);
    void refresh();
  }

  async function loadMore() {
    if (loadingMore || page >= lastPage) return;
    const currentRequest = request.current;
    setLoadingMore(true);
    setActionError(null);
    try {
      const result = await listBookingNotices(authenticatedFetch, page + 1);
      if (request.current !== currentRequest) return;
      // A notice can move to the top between pages, so ids already shown are skipped.
      setNotices((previous) => [
        ...previous,
        ...result.notices.filter((notice) => !previous.some((item) => item.id === notice.id)),
      ]);
      setUnreadCount(result.unreadCount);
      setPage(result.currentPage);
      setLastPage(result.lastPage);
    } catch (cause) {
      if (request.current === currentRequest) setActionError(messageOf(cause, 'Não foi possível carregar mais avisos.'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(notice: BookingNotice): Promise<BookingNotice | null> {
    if (notice.read) return notice;
    setBusyId(notice.id);
    setActionError(null);
    try {
      const updated = await markNoticeAsRead(notice.id, authenticatedFetch);
      setNotices((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
      return updated;
    } catch (cause) {
      setActionError(messageOf(cause, 'Não foi possível marcar o aviso como lido.'));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function openNotice(notice: BookingNotice) {
    const latest = await markRead(notice);
    // The API answer is fresher than the list: the task may have been reassigned meanwhile.
    if (latest?.task?.available) onOpenTask(latest.task.id);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Clean&Check</Text>
          <Text style={styles.title}>Avisos</Text>
          {!loading && notices.length > 0 && (
            <Text style={styles.summary}>{unreadCount === 0 ? 'Tudo lido' : `${unreadCount} por ler`}</Text>
          )}
        </View>
        <Pressable accessibilityRole="button" disabled={loading || refreshing} onPress={pullToRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>

      {actionError && <Text style={[styles.error, styles.banner]} accessibilityLiveRegion="polite">{actionError}</Text>}

      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color="#1769E8" /><Text style={styles.stateText}>A carregar avisos...</Text></View>
      ) : error && notices.length === 0 ? (
        <View style={styles.stateCard}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={pullToRefresh}><Text style={styles.action}>Tentar novamente</Text></Pressable></View>
      ) : notices.length === 0 ? (
        <View style={styles.stateCard}><Text style={styles.emptyTitle}>Sem avisos</Text><Text style={styles.stateText}>Não existem avisos para apresentar.</Text></View>
      ) : (
        <>
          {error && <Text style={[styles.error, styles.banner]}>{error}</Text>}
          {notices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              busy={busyId === notice.id}
              onOpenTask={() => void openNotice(notice)}
              onMarkRead={() => void markRead(notice)}
            />
          ))}
          {page < lastPage && (
            <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMore()} style={styles.moreButton}>
              {loadingMore ? <ActivityIndicator color="#1769E8" /> : <Text style={styles.action}>Ver mais avisos</Text>}
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700', marginBottom: 5 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800' },
  summary: { color: '#53657D', fontSize: 14, marginTop: 4 },
  refreshButton: { paddingHorizontal: 8, paddingVertical: 7 },
  refreshText: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E5EAF2' },
  cardUnread: { borderColor: '#1769E8', borderWidth: 1.5 },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, color: '#172B4D', fontSize: 17, fontWeight: '800' },
  unread: { color: '#1769E8', fontSize: 11, fontWeight: '800' },
  property: { color: '#26364B', fontSize: 15, fontWeight: '700', marginTop: 10 },
  message: { color: '#53657D', fontSize: 14, lineHeight: 20, marginTop: 6 },
  timestamp: { color: '#8290A3', fontSize: 12, marginTop: 8 },
  unavailable: { color: '#53657D', fontSize: 13, lineHeight: 19, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 18 },
  busy: { alignSelf: 'flex-start', marginTop: 14 },
  openButton: { alignSelf: 'flex-start', marginTop: 14 },
  openText: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  moreButton: { alignItems: 'center', paddingVertical: 14 },
  stateCard: { alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  stateText: { color: '#53657D', fontSize: 15, lineHeight: 21 },
  error: { color: '#A52323', fontSize: 15, lineHeight: 21 },
  banner: { marginBottom: 12 },
  action: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  emptyTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});