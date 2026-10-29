import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import DiagnosticsScreen from './src/screens/DiagnosticsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';

function AppContent() {
  const { session, restoring } = useAuth();
  const [screen, setScreen] = useState<'login' | 'diagnostics' | 'home'>('login');
  const visibleScreen = !session && screen === 'home' ? 'login' : session && screen === 'login' ? 'home' : screen;

  if (restoring) {
    return <View style={styles.restoring}><StatusBar style="dark" /><ActivityIndicator color="#1769E8" size="large" /></View>;
  }

  return (
    <>
      <StatusBar style="dark" />
      {visibleScreen === 'login' && (
        <LoginScreen onOpenDiagnostics={() => setScreen('diagnostics')} />
      )}
      {visibleScreen === 'diagnostics' && (
        <DiagnosticsScreen onBack={() => setScreen('login')} />
      )}
      {visibleScreen === 'home' && <HomeScreen />}
    </>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

const styles = StyleSheet.create({
  restoring: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FC' },
});
