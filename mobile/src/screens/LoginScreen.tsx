import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AuthError, LoginFieldErrors } from '../services/auth';

type LoginScreenProps = { onOpenDiagnostics: () => void };

export default function LoginScreen({ onOpenDiagnostics }: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): LoginFieldErrors {
    const next: LoginFieldErrors = {};
    if (!email.trim()) next.email = 'Introduz o email.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Introduz um email válido.';
    if (!password) next.password = 'Introduz a palavra-passe.';
    return next;
  }

  async function submitLogin() {
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password, device_name: 'Clean&Check Mobile' });
    } catch (error) {
      if (error instanceof AuthError) {
        setErrors(error.fieldErrors);
        setSubmitError(error.message);
      } else setSubmitError('Ocorreu um erro inesperado. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}>
        <View style={styles.brandMark} accessibilityElementsHidden><Text style={styles.brandMarkText}>✦</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir diagnóstico da API" hitSlop={8} onPress={onOpenDiagnostics} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><Text style={styles.settingsIcon}>⚙</Text></Pressable>
      </View>
      <View style={styles.heading}>
        <Text style={styles.brandName}>Clean&Check</Text><Text style={styles.title}>Bem-vindo</Text><Text style={styles.subtitle}>Inicia sessão para ver as tuas tarefas.</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.label}>Email</Text>
        <TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" editable={!loading} keyboardType="email-address" onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: undefined })); setSubmitError(''); }} placeholder="nome@exemplo.com" placeholderTextColor="#8290A3" style={[styles.field, !!email && styles.fieldFilled, !!errors.email && styles.fieldError]} value={email} />
        {errors.email && <Text accessibilityRole="alert" style={styles.validationError}>{errors.email}</Text>}
        <Text style={styles.label}>Palavra-passe</Text>
        <TextInput accessibilityLabel="Palavra-passe" autoCapitalize="none" autoComplete="password" editable={!loading} onChangeText={(value) => { setPassword(value); setErrors((current) => ({ ...current, password: undefined })); setSubmitError(''); }} onSubmitEditing={submitLogin} placeholder="Introduz a palavra-passe" placeholderTextColor="#8290A3" secureTextEntry style={[styles.field, !!password && styles.fieldFilled, !!errors.password && styles.fieldError]} value={password} />
        {errors.password && <Text accessibilityRole="alert" style={styles.validationError}>{errors.password}</Text>}
        {submitError && <Text accessibilityRole="alert" style={styles.submitError}>{submitError}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={submitLogin} style={({ pressed }) => [styles.loginButton, loading && styles.loginButtonDisabled, pressed && !loading && styles.loginButtonPressed]}>
          {loading ? <View style={styles.loadingContent}><ActivityIndicator color="#FFFFFF" /><Text style={styles.loginButtonText}>A ENTRAR…</Text></View> : <Text style={styles.loginButtonText}>ENTRAR</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28, backgroundColor: '#F5F8FC' },
  topRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brandMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F0FF' },
  brandMarkText: { color: '#1769E8', fontSize: 30, fontWeight: '700' },
  settingsButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#17345E', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  settingsIcon: { color: '#1769E8', fontSize: 26 },
  heading: { marginBottom: 22 },
  brandName: { color: '#1769E8', fontSize: 19, fontWeight: '700', marginBottom: 8 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#53657D', fontSize: 18, lineHeight: 25 },
  formCard: { gap: 11, padding: 18, borderRadius: 22, backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#17345E', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  label: { color: '#26364B', fontSize: 18, fontWeight: '700', marginTop: 2 },
  field: { minHeight: 58, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#E1E7F0', borderRadius: 14, backgroundColor: '#FFFFFF', color: '#172B4D', fontSize: 17 },
  fieldFilled: { borderColor: '#8EB7F3' },
  fieldError: { borderColor: '#C73535', backgroundColor: '#FFF8F8' },
  validationError: { color: '#A52323', fontSize: 14, marginTop: -5 },
  submitError: { color: '#A52323', fontSize: 15, lineHeight: 21 },
  loginButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', marginTop: 7, borderRadius: 15, backgroundColor: '#1769E8' },
  loginButtonDisabled: { backgroundColor: '#A9C7F4' },
  loginButtonPressed: { backgroundColor: '#0D55C7' },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.75 },
});
