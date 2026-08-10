import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/GlassCard';
import { colors, spacing } from '../theme/theme';
import { useAppSettings } from '../hooks/useAppSettings';
import type { InterestCategory } from '../types';
import { t } from '../i18n';

function randomId() {
  return `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function NexusCommandScreen() {
  const { lang, interests, setInterests } = useAppSettings();
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('✨');

  const addCategory = () => {
    const label = newLabel.trim();
    if (!label) return;
    const next: InterestCategory = { id: randomId(), emoji: newEmoji.trim() || '✨', label, keywords: [] };
    setInterests([...interests, next]);
    setNewLabel('');
    setNewEmoji('✨');
  };

  const removeCategory = (id: string) => {
    setInterests(interests.filter((c) => c.id !== id));
  };

  return (
    <ScreenBackground>
      <FlatList
        data={interests}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title1}>{t(lang, 'nexus_title')}</Text>
            <Text style={styles.subtitle}>{t(lang, 'nexus_subtitle')}</Text>

            <GlassCard style={styles.addCard}>
              <View style={styles.addRow}>
                <TextInput
                  value={newEmoji}
                  onChangeText={setNewEmoji}
                  style={styles.emojiInput}
                  maxLength={2}
                  placeholder="🙂"
                  placeholderTextColor={colors.textFaint}
                />
                <TextInput
                  value={newLabel}
                  onChangeText={setNewLabel}
                  style={styles.labelInput}
                  placeholder="Category name"
                  placeholderTextColor={colors.textFaint}
                />
                <Pressable style={styles.addButton} onPress={addCategory}>
                  <Text style={styles.addButtonText}>+</Text>
                </Pressable>
              </View>
            </GlassCard>
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{item.emoji} {item.label}</Text>
              <Pressable onPress={() => removeCategory(item.id)}>
                <Text style={styles.remove}>{t(lang, 'remove')}</Text>
              </Pressable>
            </View>
            {item.keywords.length > 0 && (
              <Text style={styles.keywords}>{item.keywords.join(' · ')}</Text>
            )}
          </GlassCard>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing(3) }} />}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { marginBottom: spacing(4), gap: spacing(2) },
  title1: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textDim, marginBottom: spacing(3) },
  addCard: { padding: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiInput: {
    width: 44, height: 44, borderRadius: 10, textAlign: 'center', fontSize: 18,
    color: colors.text, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  labelInput: {
    flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12,
    color: colors.text, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  addButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  remove: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  keywords: { color: colors.textDim, fontSize: 12 },
});
