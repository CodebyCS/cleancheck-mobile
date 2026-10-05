import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.brand}>Clean&Check</Text>
      <Text style={styles.title}>Início</Text>
      <Text style={styles.message}>Login provisório concluído.</Text>
      <Text style={styles.note}>As tarefas serão apresentadas aqui quando a integração com a API estiver definida.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F5F8FC' },
  brand: { color: '#1769E8', fontSize: 19, fontWeight: '700', marginBottom: 8 },
  title: { color: '#172B4D', fontSize: 30, fontWeight: '800', marginBottom: 18 },
  message: { color: '#146B3A', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  note: { color: '#53657D', fontSize: 16, lineHeight: 23 },
});
