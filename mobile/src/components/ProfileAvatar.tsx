import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type ProfileAvatarProps = {
  name: string;
  photoUrl: string | null;
  size?: number;
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

// Shows the photo when it loads, otherwise the initials. Give it a `key` with the URL
// so a new signed URL resets the failed state.
export default function ProfileAvatar({ name, photoUrl, size = 72 }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl && !failed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.base, shape]}
        accessibilityLabel={`Fotografia de ${name}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.base, styles.initials, shape]} accessibilityLabel="Sem fotografia">
      <Text style={[styles.initialsText, { fontSize: size / 3 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: '#E7F0FF' },
  initials: { alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: '#315A92', fontWeight: '800' },
});
