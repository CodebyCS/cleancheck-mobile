import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  currentMonth,
  formatAmount,
  formatMonth,
  formatSigned,
  getMonthlySummary,
  MonthlySummary,
  MonthlySummaryError,
  shiftMonth,
} from '../services/monthlySummary';
import { formatDay } from '../services/notices';
import { taskTypeLabel } from '../services/tasks';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; canRetry: boolean }
  | { status: 'ready'; summary: MonthlySummary };

type MonthlySummaryCardProps = {
  // Changes when the profile is pulled to refresh, so the summary reloads too.
  refreshKey: number;
};

/**
 * Own services and amounts of the month. Only the logged-in provider's data is shown:
 * the API answers from the session and accepts no provider id.
 */
export default function MonthlySummaryCard({ refreshKey }: MonthlySummaryCardProps) {
  const { authenticatedFetch } = useAuth();
  const [month, setMonth] = useState(() => currentMonth());
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    try {
      const summary = await getMonthlySummary(authenticatedFetch, month);
      if (!signal.cancelled) setState({ status: 'ready', summary });
    } catch (error) {
      if (signal.cancelled) return;
      const code = error instanceof MonthlySummaryError ? error.code : null;
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível carregar o resumo do mês.',
        canRetry: code !== 'SESSION_EXPIRED' && code !== 'FORBIDDEN' && code !== 'NOT_AVAILABLE',
      });
    }
  }, [authenticatedFetch, month]);

  useEffect(() => {
    const signal = { cancelled: false };
    setState({ status: 'loading' });
    setOpenEntryId(null);
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, refreshKey]);

  function retry() {
    setState({ status: 'loading' });
    void load({ cancelled: false });
  }

  const isCurrentMonth = month === currentMonth();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resumo do mês</Text>

      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          hitSlop={8}
          onPress={() => setMonth((current) => shiftMonth(current, -1))}
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
        >
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel} accessibilityLiveRegion="polite">{formatMonth(month)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês seguinte"
          accessibilityState={{ disabled: isCurrentMonth }}
          disabled={isCurrentMonth}
          hitSlop={8}
          onPress={() => setMonth((current) => shiftMonth(current, 1))}
          style={({ pressed }) => [styles.monthButton, isCurrentMonth && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      {state.status === 'loading' && (
        <View style={styles.centered} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#1769E8" />
          <Text style={styles.muted}>A carregar o resumo…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View accessibilityRole="alert">
          <Text style={styles.errorText}>{state.message}</Text>
          {state.canRetry && (
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          )}
        </View>
      )}

      {state.status === 'ready' && state.summary.entries.length === 0 && (
        <Text style={styles.muted}>Não tens serviços apurados neste mês.</Text>
      )}

      {state.status === 'ready' && state.summary.entries.length > 0 && (
        <>
          {state.summary.totals.map((total) => (
            <View key={total.currency} style={styles.totalBox}>
              <Text style={styles.totalLabel}>
                Total apurado · {total.entries} {total.entries === 1 ? 'serviço' : 'serviços'}
              </Text>
              <Text style={styles.totalValue}>{formatAmount(total.total, total.currency)}</Text>
              {Number(total.adjustments_total) !== 0 && (
                <Text style={styles.totalParts}>
                  Original {formatAmount(total.original_total, total.currency)} · Ajustes{' '}
                  {formatSigned(total.adjustments_total, total.currency)}
                </Text>
              )}
            </View>
          ))}

          {state.summary.entries.map((entry) => {
            const adjusted = entry.adjustments.length > 0;
            const open = openEntryId === entry.id;

            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityState={{ expanded: open, disabled: !adjusted }}
                accessibilityHint={adjusted ? 'Mostra os ajustes deste serviço' : undefined}
                disabled={!adjusted}
                onPress={() => setOpenEntryId(open ? null : entry.id)}
                style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
              >
                <View style={styles.entryRow}>
                  <View style={styles.entryText}>
                    <Text style={styles.entryTitle}>{entry.property_name ?? `Serviço #${entry.task_id}`}</Text>
                    <Text style={styles.entryMeta}>
                      {formatDay(entry.service_date)} · {taskTypeLabel(entry.task_type)}
                    </Text>
                  </View>
                  <View style={styles.entryAmounts}>
                    <Text style={styles.entryAmount}>{formatAmount(entry.final_amount, entry.currency)}</Text>
                    {adjusted && (
                      <Text style={styles.entryAdjusted}>
                        {formatSigned(entry.adjustments_total, entry.currency)} {open ? '▴' : '▾'}
                      </Text>
                    )}
                  </View>
                </View>

                {open && entry.adjustments.map((adjustment, index) => (
                  <View key={`${entry.id}-${index}`} style={styles.adjustment}>
                    <Text style={styles.adjustmentAmount}>{formatSigned(adjustment.amount, entry.currency)}</Text>
                    <Text style={styles.adjustmentReason}>{adjustment.reason}</Text>
                  </View>
                ))}
              </Pressable>
            );
          })}
        </>
      )}

      <Text style={styles.note}>
        Valores apurados a partir dos serviços concluídos e dos ajustes. Não indicam se o pagamento já foi feito.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#E5EAF2', marginBottom: 18 },
  title: { color: '#172B4D', fontSize: 19, fontWeight: '800' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 14 },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#E7F0FF' },
  monthButtonText: { color: '#1769E8', fontSize: 24, fontWeight: '800', lineHeight: 26 },
  monthLabel: { color: '#172B4D', fontSize: 16, fontWeight: '700' },
  centered: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  muted: { color: '#53657D', fontSize: 15 },
  errorText: { color: '#A52323', fontSize: 15, lineHeight: 21 },
  retryButton: { marginTop: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1769E8' },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  totalBox: { backgroundColor: '#F5F8FC', borderRadius: 14, padding: 14, marginBottom: 12 },
  totalLabel: { color: '#53657D', fontSize: 13, fontWeight: '700' },
  totalValue: { color: '#172B4D', fontSize: 28, fontWeight: '800', marginTop: 4 },
  totalParts: { color: '#53657D', fontSize: 13, marginTop: 4 },
  entry: { borderTopWidth: 1, borderTopColor: '#E5EAF2', paddingVertical: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  entryText: { flex: 1 },
  entryTitle: { color: '#172B4D', fontSize: 15, fontWeight: '700' },
  entryMeta: { color: '#53657D', fontSize: 13, marginTop: 3 },
  entryAmounts: { alignItems: 'flex-end' },
  entryAmount: { color: '#172B4D', fontSize: 15, fontWeight: '800' },
  entryAdjusted: { color: '#B45309', fontSize: 12, fontWeight: '700', marginTop: 3 },
  adjustment: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#FFF8EB' },
  adjustmentAmount: { color: '#B45309', fontSize: 13, fontWeight: '800' },
  adjustmentReason: { color: '#53657D', fontSize: 13, marginTop: 2, lineHeight: 18 },
  note: { color: '#8290A3', fontSize: 12, lineHeight: 17, marginTop: 12 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
