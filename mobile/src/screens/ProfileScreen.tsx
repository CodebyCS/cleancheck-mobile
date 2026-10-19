import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
  if (loading) return;

  setLoading(true);

  try {
    await signOut();
  } catch (error) {
    Alert.alert(
      'Não foi possível concluir a saída',
      error instanceof Error
        ? error.message
        : 'Tenta novamente.',
    );
  } finally {
    setLoading(false);
  }
}

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>Perfil</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{session?.user.name ?? 'Prestador'}</Text>
        <Text style={styles.email}>{session?.user.email}</Text>
        <Text style={styles.role}>{session?.user.role}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={handleLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}>
        {loading ? <><ActivityIndicator color="#A52323" /><Text style={styles.logoutText}>A terminar sessão…</Text></> : <Text style={styles.logoutText}>Terminar sessão</Text>}
      </Pressable>
      <Text style={styles.note}>É necessária ligação à API para confirmar o fim da sessão.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  brand: { color: '#1769E8', fontSize: 17, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#E5EAF2', marginBottom: 18 },
  name: { color: '#172B4D', fontSize: 21, fontWeight: '800' },
  email: { color: '#53657D', fontSize: 15, marginTop: 7 },
  role: { alignSelf: 'flex-start', color: '#315A92', backgroundColor: '#E7F0FF', fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, marginTop: 13, overflow: 'hidden' },
  logoutButton: { minHeight: 54, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: '#C73535', backgroundColor: '#FFFFFF' },
  logoutText: { color: '#A52323', fontSize: 16, fontWeight: '800' },
  note: { color: '#8290A3', fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
