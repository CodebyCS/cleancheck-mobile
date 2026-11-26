import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {
  uploadMyTaskEvidence,
  type AuthenticatedFetch,
} from '../services/tasks'

type Props = {
  taskId: number
  authenticatedFetch: AuthenticatedFetch
}

export default function TaskEvidenceUploader({
  taskId,
  authenticatedFetch,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function chooseAndUploadMedia() {
    setUploading(true)
    setMessage('')
    setError('')

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        setError('É necessário permitir o acesso às fotos e vídeos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        quality: 1,
      })

      if (result.canceled) return

      const asset = result.assets[0]
      if (!asset) {
        setError('Não foi possível obter o arquivo selecionado.')
        return
      }

      const isVideo = asset.type === 'video'
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024

      if (asset.fileSize != null && asset.fileSize > maxSize) {
        setError(
          isVideo
            ? 'O vídeo não pode ter mais de 50 MB.'
            : 'A fotografia não pode ter mais de 10 MB.',
        )
        return
      }

      await uploadMyTaskEvidence(
        taskId,
        {
          uri: asset.uri,
          fileName:
            asset.fileName ??
            `task-${taskId}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          mimeType: asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        },
        authenticatedFetch,
      )

      setMessage('Mídia enviada.')
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Não foi possível enviar a mídia.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={uploading}
        onPress={() => void chooseAndUploadMedia()}
        style={({ pressed }) => [
          styles.button,
          uploading && styles.buttonDisabled,
          pressed && !uploading && styles.pressed,
        ]}
      >
        {uploading ? (
          <ActivityIndicator color="#1769E8" />
        ) : (
          <Text style={styles.buttonText}>Adicionar foto ou vídeo</Text>
        )}
      </Pressable>

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