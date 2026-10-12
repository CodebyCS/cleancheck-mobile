import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import DiagnosticsScreen from './src/screens/DiagnosticsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';

function AppContent() {
  const { session } = useAuth();
  const [screen, setScreen] = useState<'login' | 'diagnostics' | 'home'>('login');
  const visibleScreen = session && screen === 'login' ? 'home' : screen;

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
