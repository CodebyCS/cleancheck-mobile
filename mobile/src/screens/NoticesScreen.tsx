import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthenticatedFetch } from '../services/tasks';
import { BookingNotice, listBookingNotices } from '../services/notices';

type NoticesScreenProps = {
  authenticatedFetch: AuthenticatedFetch;
  onOpenTask: (taskId: number) => void;
};

function noticeTitle(type: BookingNotice['type']): string {
  return type === 'booking_updated' ? 'Reserva alterada' : 'Reserva cancelada';
}

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function NoticeCard({ notice, onOpenTask }: { notice: BookingNotice; onOpenTask: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <Text style={styles.cardTitle}>{noticeTitle(notice.type)}</Text>
        {!notice.read && <Text style={styles.unread}>NOVO</Text>}
      </View>
      <Text style={styles.property}>{notice.property.name}</Text>
      <Text style={styles.message}>Reserva {notice.booking.status === 'cancelled' ? 'cancelada' : 'atualizada'}: {notice.booking.checkIn} — {notice.booking.checkOut}</Text>
      <Text style={styles.timestamp}>Recebido {dateLabel(notice.notifiedAt)}</Text>
      {notice.task === null ? (
        <Text style={styles.unavailable}>Este aviso não está associado a uma tarefa.</Text>
      ) : !notice.task.available ? (
        <Text style={styles.unavailable}>A tarefa já não está disponível para a tua conta.</Text>
      ) : (
        <Pressable accessibilityRole="button" onPress={onOpenTask} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
          <Text style={styles.openText}>Abrir tarefa atual ›</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function NoticesScreen({ authenticatedFetch, onOpenTask }: NoticesScreenProps) {
  const [notices, setNotices] = useState<BookingNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const data = await listBookingNotices(authenticatedFetch);
      if (request.current === currentRequest) setNotices(data);
    } catch (cause) {
      if (request.current === currentRequest) {
        setNotices([]);
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os avisos.');
      }
    } finally {
      if (request.current === currentRequest) setLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]);

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <View><Text style={styles.brand}>Clean&Check</Text><Text style={styles.title}>Avisos</Text></View>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.stateCard}><ActivityIndicator color="#1769E8" /><Text style={styles.stateText}>A carregar avisos...</Text></View>
      ) : error ? (
        <View style={styles.stateCard}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.action}>Tentar novamente</Text></Pressable></View>
      ) : notices.length === 0 ? (
        <View style={styles.stateCard}><Text style={styles.emptyTitle}>Sem avisos</Text><Text style={styles.stateText}>Não existem avisos para apresentar.</Text></View>
      ) : notices.map((notice) => <NoticeCard key={notice.id} notice={notice} onOpenTask={() => onOpenTask(notice.task!.id)} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700', marginBottom: 5 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800' },
  refreshButton: { paddingHorizontal: 8, paddingVertical: 7 },
  refreshText: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E5EAF2' },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, color: '#172B4D', fontSize: 17, fontWeight: '800' },
  unread: { color: '#1769E8', fontSize: 11, fontWeight: '800' },
  property: { color: '#26364B', fontSize: 15, fontWeight: '700', marginTop: 10 },
  message: { color: '#53657D', fontSize: 14, lineHeight: 20, marginTop: 6 },
  timestamp: { color: '#8290A3', fontSize: 12, marginTop: 8 },
  unavailable: { color: '#53657D', fontSize: 13, lineHeight: 19, marginTop: 14 },
  openButton: { alignSelf: 'flex-start', marginTop: 14 },
  openText: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  stateCard: { alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 22 },
  stateText: { color: '#53657D', fontSize: 15, lineHeight: 21 },
  error: { color: '#A52323', fontSize: 15, lineHeight: 21 },
  action: { color: '#1769E8', fontSize: 14, fontWeight: '800' },
  emptyTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
