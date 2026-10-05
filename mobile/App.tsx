import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import DiagnosticsScreen from './src/screens/DiagnosticsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  // Navegação provisória até ser definido o fluxo real de autenticação e sessão com o Carlos.
  const [screen, setScreen] = useState<'login' | 'diagnostics' | 'home'>('login');

  return (
    <>
      <StatusBar style="dark" />
      {screen === 'login' && (
        <LoginScreen onLoginSuccess={() => setScreen('home')} onOpenDiagnostics={() => setScreen('diagnostics')} />
      )}
      {screen === 'diagnostics' && (
        <DiagnosticsScreen onBack={() => setScreen('login')} />
      )}
      {screen === 'home' && <HomeScreen />}
    </>
  );
}
