import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type LoginScreenProps = {
  onOpenDiagnostics: () => void;
};

type ActiveField = 'phone' | 'pin';

const keypadRows = [ ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['⌫', '0', '✓'] ];

export default function LoginScreen({ onOpenDiagnostics }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>('phone');

  // O teclado integrado mantém as teclas grandes e evita abrir o teclado do sistema.
  function pressKey(key: string) {
    const value = activeField === 'phone' ? phone : pin;
    const update = activeField === 'phone' ? setPhone : setPin;

    if (key === '⌫') {
      update(value.slice(0, -1));
      return;
    }

    if (key === '✓') {
      setActiveField(activeField === 'phone' ? 'pin' : 'phone');
      return;
    }

    update(`${value}${key}`);
  }

  function submitLogin() {
    Alert.alert(
      'Login ainda não configurado',
      'O ecrã está pronto. A autenticação será ligada quando o contrato da API estiver definido.',
    );
  }

  const canSubmit = phone.length > 0 && pin.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <View style={styles.brandMark} accessibilityElementsHidden>
          <Text style={styles.brandMarkText}>✦</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir diagnóstico da API"
          hitSlop={8}
          onPress={onOpenDiagnostics}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.heading}>
        <Text style={styles.brandName}>Clean&Check</Text>
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Inicia sessão para ver as tuas tarefas.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Número de Telemóvel</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Número de Telemóvel: ${phone || 'vazio'}`}
          accessibilityState={{ selected: activeField === 'phone' }}
          onPress={() => setActiveField('phone')}
          style={[styles.field, activeField === 'phone' && styles.fieldActive]}
        >
          <Text style={styles.fieldIcon}>📞</Text>
          <Text style={[styles.fieldValue, !phone && styles.placeholder]}>
            {phone || 'Toca aqui e usa o teclado'}
          </Text>
        </Pressable>

        <Text style={styles.label}>PIN de Segurança</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`PIN de Segurança: ${pin.length} algarismos`}
          accessibilityState={{ selected: activeField === 'pin' }}
          onPress={() => setActiveField('pin')}
          style={[styles.field, activeField === 'pin' && styles.fieldActive]}
        >
          <Text style={styles.fieldIcon}>🔒</Text>
          <Text style={[styles.fieldValue, !pin && styles.placeholder]}>
            {pin ? '● '.repeat(pin.length).trim() : 'Toca aqui e usa o teclado'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submitLogin}
          style={({ pressed }) => [
            styles.loginButton,
            !canSubmit && styles.loginButtonDisabled,
            pressed && canSubmit && styles.loginButtonPressed,
          ]}
        >
          <Text style={styles.loginButtonText}>ENTRAR</Text>
        </Pressable>
      </View>

      <View style={styles.keypad} accessibilityLabel="Teclado numérico">
        {keypadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === '⌫' ? 'Apagar último algarismo' : key === '✓' ? 'Mudar de campo' : key}
                onPress={() => pressKey(key)}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                <Text style={[styles.keyText, key === '✓' && styles.keyActionText]}>{key}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    backgroundColor: '#F5F8FC',
  },
  topRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F0FF',
  },
  brandMarkText: { color: '#1769E8', fontSize: 30, fontWeight: '700' },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#17345E',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  settingsIcon: { color: '#1769E8', fontSize: 26 },
  heading: { marginBottom: 22 },
  brandName: { color: '#1769E8', fontSize: 19, fontWeight: '700', marginBottom: 8 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#53657D', fontSize: 18, lineHeight: 25 },
  formCard: {
    gap: 11,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#17345E',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  label: { color: '#26364B', fontSize: 18, fontWeight: '700', marginTop: 2 },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E1E7F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  fieldActive: { borderColor: '#1769E8', backgroundColor: '#F7FAFF' },
  fieldIcon: { color: '#1769E8', fontSize: 21, width: 24, textAlign: 'center' },
  fieldValue: { color: '#172B4D', fontSize: 18, fontWeight: '600' },
  placeholder: { color: '#8290A3', fontSize: 18, fontWeight: '400' },
  loginButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    borderRadius: 15,
    backgroundColor: '#1769E8',
  },
  loginButtonDisabled: { backgroundColor: '#A9C7F4' },
  loginButtonPressed: { backgroundColor: '#0D55C7' },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  keypad: { gap: 8, marginTop: 16 },
  keypadRow: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  keyPressed: { backgroundColor: '#E7F0FF', borderColor: '#1769E8' },
  keyText: { color: '#172B4D', fontSize: 20, fontWeight: '700' },
  keyActionText: { color: '#1769E8' },
  pressed: { opacity: 0.75 },
});
