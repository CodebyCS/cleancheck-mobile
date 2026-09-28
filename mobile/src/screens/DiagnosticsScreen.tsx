import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkApiHealth, healthUrl } from '../services/apiHealth';

type Result = { state: 'idle' | 'loading' } | { state: 'success'; status: number } | { state: 'error'; message: string };

export default function DiagnosticsScreen() {
  const [result, setResult] = useState<Result>({ state: 'idle' });
  const active = useRef<AbortController | null>(null);

  // Cancelar ao sair impede atualizações de um ecrã já desmontado.
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  async function diagnose() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setResult({ state: 'loading' });
    let timedOut = false;
    // A API desligada não pode deixar o ecrã a carregar indefinidamente.
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 10000);
    try {
      const status = await checkApiHealth(controller.signal);
      if (active.current === controller) setResult({ state: 'success', status });
    } catch (error) {
      if (active.current === controller) setResult({ state: 'error', message: timedOut
        ? 'Tempo limite de 10 segundos excedido. Verifica a API e a rede.'
        : error instanceof TypeError ? 'Não foi possível contactar a API. Verifica o servidor, o IP e o Wi-Fi.'
        : error instanceof Error ? error.message : 'Erro ao verificar a ligação.' });
    } finally {
      clearTimeout(timer);
      if (active.current === controller) active.current = null;
    }
  }

  const loading = result.state === 'loading';
  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>Diagnóstico da API</Text>
      <View style={styles.card}>
        <Text>Endereço de diagnóstico</Text>
        <Text selectable>{healthUrl || 'Não configurado'}</Text>
        <View accessibilityLiveRegion="polite" style={styles.result}>
          {result.state === 'idle' && <Text>Pronto para testar a ligação.</Text>}
          {loading && <><ActivityIndicator color="#00666B" /><Text>A verificar ligação…</Text></>}
          {result.state === 'success' && <Text style={styles.success}>API acessível · HTTP {result.status}</Text>}
          {result.state === 'error' && <Text accessibilityRole="alert" style={styles.error}>{result.message}</Text>}
        </View>
        <Button color="#00666B" disabled={loading} onPress={diagnose}
          title={loading ? 'A verificar…' : result.state === 'idle' ? 'Testar ligação' : 'Testar novamente'} />
      </View>
      <Text style={styles.note}>Este teste verifica a resposta de /up. Não valida a base de dados nem a autenticação.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 64, backgroundColor: '#F1F6F6' },
  brand: { color: '#00666B', fontWeight: '700', fontSize: 18, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#123638', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, gap: 16 },
  result: { minHeight: 64, justifyContent: 'center', gap: 10 },
  success: { color: '#146B3A', fontWeight: '700', fontSize: 18 },
  error: { color: '#A52323', fontSize: 16 },
  note: { color: '#465E60', marginTop: 20, lineHeight: 21 },
});
