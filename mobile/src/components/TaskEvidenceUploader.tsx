import { useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  uploadMyTaskEvidence,
  type AuthenticatedFetch,
  type TaskEvidenceRecord,
  validateTaskEvidenceMetadata,
} from '../services/tasks'

type Props = {
  taskId: number
  authenticatedFetch: AuthenticatedFetch
  phaseLabel: string
  disabled?: boolean
  onUploaded: (evidence: TaskEvidenceRecord) => void
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime',
}
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
  'image/heif': 'heif', 'video/mp4': 'mp4', 'video/quicktime': 'mov',
}

export default function TaskEvidenceUploader({
  taskId,
  authenticatedFetch,
  phaseLabel,
  disabled = false,
  onUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function chooseAndUploadMedia(source: 'camera' | 'library') {
    let uploadStarted = false
    setUploading(true)
    setMessage('')
    setError('')

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        setError(source === 'camera'
          ? 'Sem acesso à câmara. Permite a utilização nas definições e tenta novamente.'
          : 'Sem acesso às fotografias e vídeos. Permite a utilização nas definições e tenta novamente.')
        return
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        quality: 1,
        videoMaxDuration: 60,
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (result.canceled) return

      const asset = result.assets[0]
      if (!asset) {
        setError('Não foi possível obter o arquivo selecionado.')
        return
      }

      const isVideo = asset.type === 'video'
      const fileExtension = (asset.fileName ?? asset.uri).split(/[?#]/, 1)[0].split('.').pop()?.toLowerCase() ?? ''
      const mimeType = asset.mimeType?.toLowerCase() ?? MIME_BY_EXTENSION[fileExtension]
      const extension = fileExtension || (mimeType ? EXTENSION_BY_MIME[mimeType] : '')
      const validationError = validateTaskEvidenceMetadata(
        isVideo ? 'video' : 'photo', mimeType ?? null, asset.fileSize ?? null, asset.duration ?? null,
      )
      if (validationError) {
        setError(validationError)
        return
      }

      uploadStarted = true
      const evidence = await uploadMyTaskEvidence(
        taskId,
        {
          uri: asset.uri,
          fileName:
            asset.fileName ??
            `task-${taskId}-${Date.now()}.${extension}`,
          mimeType,
        },
        authenticatedFetch,
      )

      onUploaded(evidence)
      setMessage(`${phaseLabel}: ficheiro enviado e confirmado pela API.`)
    } catch (uploadError) {
      if (uploadError instanceof Error && 'code' in uploadError && uploadError.code === 'NETWORK') {
        setError('Não foi possível confirmar o upload. O servidor pode ter recebido o ficheiro; não repitas já, porque o endpoint não suporta chave idempotente.')
      } else if (source === 'camera' && !uploadStarted) {
        setError('Sem acesso à câmara ou ao microfone. Confirma as permissões nas definições e tenta novamente.')
      } else {
        setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a mídia.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.phase}>{phaseLabel}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={uploading || disabled}
        onPress={() => void chooseAndUploadMedia('camera')}
        style={({ pressed }) => [
          styles.button,
          (uploading || disabled) && styles.buttonDisabled,
          pressed && !uploading && styles.pressed,
        ]}
      >
        {uploading ? (
          <ActivityIndicator color="#1769E8" />
        ) : (
          <Text style={styles.buttonText}>Tirar foto ou gravar vídeo</Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={uploading || disabled}
        onPress={() => void chooseAndUploadMedia('library')}
        style={({ pressed }) => [styles.libraryButton, (uploading || disabled) && styles.buttonDisabled, pressed && !uploading && !disabled && styles.pressed]}
      >
        <Text style={styles.libraryButtonText}>Escolher na galeria</Text>
      </Pressable>
      {error.includes('Sem acesso') && (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
          <Text style={styles.settingsLink}>Abrir definições</Text>
        </Pressable>
      )}

      {message !== '' && <Text style={styles.success}>{message}</Text>}
      {error !== '' && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 16,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1769E8',
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#1769E8',
    fontSize: 14,
    fontWeight: '800',
  },
  phase: { color: '#53657D', fontSize: 13, fontWeight: '800' },
  libraryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 12 },
  libraryButtonText: { color: '#1769E8', fontSize: 14, fontWeight: '700' },
  settingsLink: { color: '#1769E8', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  pressed: {
    opacity: 0.75,
  },
  success: {
    color: '#146B3A',
    fontSize: 14,
  },
  error: {
    color: '#A52323',
    fontSize: 14,
  },
})
