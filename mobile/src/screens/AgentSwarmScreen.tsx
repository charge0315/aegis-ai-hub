import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/GlassCard';
import { AgentStatusPill } from '../components/AgentStatusPill';
import { agentColors, colors, spacing } from '../theme/theme';
import { initialAgentStatuses, runOrchestration } from '../services/agents';
import { SEED_ARTICLES } from '../data/sampleArticles';
import type { AgentStatus } from '../types';
import { useAppSettings } from '../hooks/useAppSettings';
import { t } from '../i18n';

export function AgentSwarmScreen() {
  const { lang, llmConfig, apiKey, interests } = useAppSettings();
  const [agents, setAgents] = useState<AgentStatus[]>(initialAgentStatuses());
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    await runOrchestration({
      llmConfig,
      apiKey: apiKey || undefined,
      interests,
      articles: SEED_ARTICLES,
      onAgentUpdate: (status) => setAgents((prev) => prev.map((a) => (a.id === status.id ? status : a))),
    });
    setRunning(false);
  };

  return (
    <ScreenBackground>
      <FlatList
        data={agents}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title1}>{t(lang, 'agents_title')}</Text>
            <Pressable style={styles.runButton} onPress={handleRun} disabled={running}>
              {running ? <ActivityIndicator color={colors.text} /> : <Text style={styles.runButtonText}>{t(lang, 'run_orchestration')}</Text>}
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: agentColors[item.id] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role}</Text>
              </View>
              <AgentStatusPill status={item.status} />
            </View>
            <Text style={styles.message}>{item.lastMessage}</Text>
          </GlassCard>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing(3) }} />}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { marginBottom: spacing(4), gap: spacing(3) },
  title1: { fontSize: 26, fontWeight: '800', color: colors.text },
  runButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  runButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  role: { color: colors.textDim, fontSize: 12 },
  message: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
});
