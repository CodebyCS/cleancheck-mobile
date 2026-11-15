import { StyleSheet, Text, View } from 'react-native';

type InfoRowProps = {
  label: string;
  value: string | null;
  // Shown when the value is missing.
  emptyText?: string;
};

export default function InfoRow({ label, value, emptyText = 'Não indicado' }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.empty]}>{value || emptyText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  label: { color: '#8290A3', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  value: { color: '#172B4D', fontSize: 15, marginTop: 3 },
  empty: { color: '#8290A3' },
});
