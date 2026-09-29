import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import DiagnosticsScreen from './src/screens/DiagnosticsScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [screen, setScreen] = useState<'login' | 'diagnostics'>('login');

  return (
    <>
      <StatusBar style="dark" />
      {screen === 'login' ? (
        <LoginScreen onOpenDiagnostics={() => setScreen('diagnostics')} />
      ) : (
        <DiagnosticsScreen onBack={() => setScreen('login')} />
      )}
    </>
  );
}
