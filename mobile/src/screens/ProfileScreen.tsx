import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AuthError } from '../services/auth';
import { getProfile, Profile } from '../services/profile';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; sessionExpired: boolean }
  | { status: 'ready'; profile: Profile };

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function formatAddress(profile: Profile): string | null {
  const locality = [profile.postal_code, profile.city].filter(Boolean).join(' ');
  const parts = [profile.address, locality].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function ProfileScreen() {
  const { signOut, authenticatedFetch } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getProfile(authenticatedFetch);
      setPhotoFailed(false);
      setState({ status: 'ready', profile });
    } catch (error) {
      const sessionExpired = error instanceof AuthError && error.code === 'SESSION_EXPIRED';
      setState({
        status: 'error',
        sessionExpired,
        message: error instanceof Error ? error.message : 'Não foi possível carregar o perfil.',
      });
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleRetry() {
    setState({ status: 'loading' });
    await loadProfile();
  }

  // The signed photo URL expires after a few minutes, so pulling refreshes it.
  async function handleRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        'Não foi possível concluir a saída',
        error instanceof Error ? error.message : 'Tenta novamente.',
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>Perfil</Text>

      {state.status === 'loading' && (
        <View style={[styles.card, styles.centered]} accessibilityLiveRegion="polite">
          <ActivityIndicator color="#1769E8" />
          <Text style={styles.muted}>A carregar o perfil…</Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={[styles.card, styles.errorCard]} accessibilityRole="alert">
          <Text style={styles.errorTitle}>
            {state.sessionExpired ? 'Sessão terminada' : 'Não foi possível carregar o perfil'}
          </Text>
          <Text style={styles.errorText}>{state.message}</Text>
          {!state.sessionExpired && (
            <Pressable
              accessibilityRole="button"
              onPress={handleRetry}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          )}
        </View>
      )}

      {state.status === 'ready' && (
        <View style={styles.card}>
          <View style={styles.header}>
            {state.profile.photo_url && !photoFailed ? (
              <Image
                source={{ uri: state.profile.photo_url }}
                style={styles.photo}
                accessibilityLabel={`Fotografia de ${state.profile.name}`}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <View style={[styles.photo, styles.initials]} accessibilityLabel="Sem fotografia">
                <Text style={styles.initialsText}>{initialsOf(state.profile.name)}</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.name}>{state.profile.name}</Text>
              <Text style={styles.role}>Prestador</Text>
            </View>
          </View>

          <ProfileRow label="E-mail" value={state.profile.email} />
          <ProfileRow label="Telefone" value={state.profile.phone} />
          <ProfileRow label="Morada" value={formatAddress(state.profile) ?? 'Não indicada'} />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
        disabled={loggingOut}
        onPress={handleLogout}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
      >
        {loggingOut ? (
          <>
            <ActivityIndicator color="#A52323" />
            <Text style={styles.logoutText}>A terminar sessão…</Text>
          </>
        ) : (
          <Text style={styles.logoutText}>Terminar sessão</Text>
        )}
      </Pressable>
      <Text style={styles.note}>A sessão é removida deste dispositivo mesmo sem ligação à API.</Text>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#E5EAF2', marginBottom: 18 },
  centered: { alignItems: 'center', gap: 10 },
  muted: { color: '#53657D', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  headerText: { flex: 1 },
  photo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E7F0FF' },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: '#315A92', fontSize: 24, fontWeight: '800' },
  name: { color: '#172B4D', fontSize: 21, fontWeight: '800' },
  role: { alignSelf: 'flex-start', color: '#315A92', backgroundColor: '#E7F0FF', fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, marginTop: 8, overflow: 'hidden' },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  rowLabel: { color: '#8290A3', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  rowValue: { color: '#172B4D', fontSize: 15, marginTop: 3 },
  errorCard: { borderColor: '#F3C2C2', backgroundColor: '#FFF7F7' },
  errorTitle: { color: '#A52323', fontSize: 17, fontWeight: '800' },
  errorText: { color: '#53657D', fontSize: 15, marginTop: 6, lineHeight: 21 },
  retryButton: { marginTop: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1769E8' },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  logoutButton: { minHeight: 54, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: '#C73535', backgroundColor: '#FFFFFF' },
  logoutText: { color: '#A52323', fontSize: 16, fontWeight: '800' },
  note: { color: '#8290A3', fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
