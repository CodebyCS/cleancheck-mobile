import { Pressable, StyleSheet, Text, View } from 'react-native';

export type MainTab = 'tasks' | 'calendar' | 'notices' | 'profile';

const tabs: { id: MainTab; label: string; icon: string }[] = [
  { id: 'tasks', label: 'Tarefas', icon: '✓' },
  { id: 'calendar', label: 'Agenda', icon: '▦' },
  { id: 'notices', label: 'Avisos', icon: '●' },
  { id: 'profile', label: 'Perfil', icon: '○' },
];

export default function MainTabBar({ active, onSelect }: { active: MainTab; onSelect: (tab: MainTab) => void }) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onSelect(tab.id)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Text style={[styles.icon, selected && styles.active]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.active]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5EAF2', shadowColor: '#17345E', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { color: '#8290A3', fontSize: 20, fontWeight: '700' },
  label: { color: '#8290A3', fontSize: 12, fontWeight: '600' },
  active: { color: '#1769E8', fontWeight: '800' },
  pressed: { opacity: 0.65 },
});
