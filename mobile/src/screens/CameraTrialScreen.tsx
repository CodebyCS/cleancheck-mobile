import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import InfoRow from '../components/InfoRow';
import { AuthError } from '../services/auth';
import {
  EvidenceTrialResult,
  exceedsLimit,
  formatBytes,
  TrialFile,
  uploadEvidenceTrial,
} from '../services/evidenceTrial';

type CameraTrialScreenProps = { onBack: () => void };

type Source = 'photo' | 'video' | 'library';

// Maximum recording length offered by the camera during the trial.
const VIDEO_MAX_SECONDS = 60;

function toTrialFile(asset: ImagePicker.ImagePickerAsset): TrialFile {
  const kind = asset.type === 'video' || asset.type === 'pairedVideo' ? 'video' : 'photo';
  const fallbackMime = kind === 'video' ? 'video/mp4' : 'image/jpeg';
  const mimeType = asset.mimeType ?? fallbackMime;
  const extension = mimeType.split('/')[1]?.replace('quicktime', 'mov') ?? (kind === 'video' ? 'mp4' : 'jpg');

  return {
    uri: asset.uri,
    name: asset.fileName ?? `ensaio-${Date.now()}.${extension}`,
    mimeType,
    kind,
    sizeBytes: typeof asset.fileSize === 'number' ? asset.fileSize : null,
  };
}

export default function CameraTrialScreen({ onBack }: CameraTrialScreenProps) {
  const { authenticatedFetch } = useAuth();
  const [file, setFile] = useState<TrialFile | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [device, setDevice] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ data: EvidenceTrialResult; durationMs: number } | null>(null);

  async function pick(source: Source) {
    setError('');
    setResult(null);

    try {
      if (source === 'library') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Sem acesso às fotografias. Ativa a permissão nas definições do telemóvel.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Sem acesso à câmara. Ativa a permissão nas definições do telemóvel.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: source === 'photo' ? ['images'] : source === 'video' ? ['videos'] : ['images', 'videos'],
        quality: 0.8,
        videoMaxDuration: VIDEO_MAX_SECONDS,
      };
      const picked = source === 'library'
        ? await ImagePicker.launchImageLibraryAsync(options)
        : await ImagePicker.launchCameraAsync(options);

      if (picked.canceled || picked.assets.length === 0) return;

      const asset = picked.assets[0];
      setFile(toTrialFile(asset));
      setDurationSeconds(typeof asset.duration === 'number' ? Math.round(asset.duration / 1000) : null);
    } catch {
      setError('Não foi possível abrir a câmara ou a galeria neste aparelho.');
    }
  }

  async function send() {
    if (!file) return;
    setSending(true);
    setError('');
    setResult(null);

    try {
      const { result: data, durationMs } = await uploadEvidenceTrial(file, device.trim() || null, authenticatedFetch);
      setResult({ data, durationMs });
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === 'SESSION_EXPIRED') {
        setError(caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : 'O envio falhou.');
      }
    } finally {
      setSending(false);
    }
  }

  const overLimit = file !== null && exceedsLimit(file);

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Text style={styles.backText}>‹ Voltar ao perfil</Text>
      </Pressable>

      <Text style={styles.eyebrow}>Ensaio</Text>
      <Text style={styles.title}>Câmara e envio</Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Serve só para testar a câmara e o envio para a API. O ficheiro não fica ligado a nenhuma tarefa e não conta como prova da limpeza.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable accessibilityRole="button" disabled={sending} onPress={() => void pick('photo')} style={({ pressed }) => [styles.secondaryButton, sending && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Tirar fotografia</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={sending} onPress={() => void pick('video')} style={({ pressed }) => [styles.secondaryButton, sending && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Gravar vídeo</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" disabled={sending} onPress={() => void pick('library')} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
        <Text style={styles.linkText}>Escolher da galeria</Text>
      </Pressable>

      {file && (
        <View style={styles.card}>
          {file.kind === 'photo' && <Image source={{ uri: file.uri }} style={styles.preview} accessibilityLabel="Pré-visualização da fotografia" />}
          <InfoRow label="Tipo" value={file.kind === 'photo' ? 'Fotografia' : 'Vídeo'} />
          <InfoRow label="Formato" value={file.mimeType} />
          <InfoRow label="Tamanho" value={formatBytes(file.sizeBytes)} />
          {file.kind === 'video' && <InfoRow label="Duração" value={durationSeconds === null ? null : `${durationSeconds} s`} />}
          {overLimit && (
            <Text style={styles.warning}>
              Acima do limite ({file.kind === 'photo' ? '10 MB' : '50 MB'}). Podes enviar na mesma para registar a resposta da API.
            </Text>
          )}

          <Text style={styles.label}>Aparelho e rede (opcional)</Text>
          <TextInput
            accessibilityLabel="Aparelho e rede"
            value={device}
            onChangeText={setDevice}
            placeholder="Ex.: Pixel 7, Android 15, 4G"
            maxLength={120}
            editable={!sending}
            style={styles.input}
          />

          <Pressable accessibilityRole="button" disabled={sending} onPress={() => void send()} style={({ pressed }) => [styles.primaryButton, sending && styles.primaryDisabled, pressed && styles.pressed]}>
            {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Enviar para a API</Text>}
          </Pressable>
        </View>
      )}

      {error !== '' && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

      {result && (
        <View style={[styles.card, styles.success]} accessibilityLiveRegion="polite">
          <Text style={styles.successTitle}>Recebido pela API</Text>
          <InfoRow label="Tipo detetado" value={result.data.kind === 'photo' ? 'Fotografia' : 'Vídeo'} />
          <InfoRow label="Formato detetado" value={result.data.mime_type} />
          <InfoRow label="Tamanho recebido" value={formatBytes(result.data.size_bytes)} />
          <InfoRow label="Tempo de envio" value={`${(result.durationMs / 1000).toFixed(1).replace('.', ',')} s`} />
          <InfoRow label="Aparelho" value={result.data.device} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Same spacing as the profile tab, leaving room for the tab bar.
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 42, paddingBottom: 112, backgroundColor: '#F5F8FC' },
  back: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },
  backText: { color: '#1769E8', fontSize: 15, fontWeight: '700' },
  eyebrow: { color: '#8290A3', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: '#172B4D', fontSize: 26, fontWeight: '800', marginTop: 4, marginBottom: 14 },
  notice: { backgroundColor: '#E7F0FF', borderRadius: 14, padding: 14, marginBottom: 16 },
  noticeText: { color: '#315A92', fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#1769E8', backgroundColor: '#FFFFFF', paddingHorizontal: 8 },
  secondaryText: { color: '#1769E8', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  linkButton: { alignSelf: 'center', paddingVertical: 12 },
  linkText: { color: '#53657D', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E3E9F2' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginBottom: 10, backgroundColor: '#EEF2F7' },
  warning: { color: '#9A5B00', fontSize: 13, lineHeight: 19, marginTop: 10 },
  label: { color: '#8290A3', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 14 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#D4DCE8', borderRadius: 12, paddingHorizontal: 12, color: '#26364B', fontSize: 15, marginTop: 6 },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#1769E8', marginTop: 16 },
  primaryDisabled: { backgroundColor: '#A9C7F4' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { color: '#A52323', fontSize: 14, lineHeight: 20, marginTop: 14 },
  success: { borderColor: '#9ED3B4', backgroundColor: '#F2FBF5' },
  successTitle: { color: '#146B3A', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pressed: { opacity: 0.75 },
});
