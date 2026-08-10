import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/GlassCard';
import { ScoreBadge } from '../components/ScoreBadge';
import { colors, spacing } from '../theme/theme';
import { SEED_ARTICLES } from '../data/sampleArticles';
import type { Article } from '../types';
import { useAppSettings } from '../hooks/useAppSettings';
import { t } from '../i18n';

function ArticleCard({ article }: { article: Article }) {
  return (
    <Pressable onPress={() => Linking.openURL(article.link)}>
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.brand} numberOfLines={1}>{article.brand} · {article.category}</Text>
          <ScoreBadge score={article.score} />
        </View>
        <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{article.desc}</Text>
        {article.aiReason ? <Text style={styles.reason} numberOfLines={2}>✦ {article.aiReason}</Text> : null}
      </GlassCard>
    </Pressable>
  );
}

export function DashboardScreen() {
  const { lang } = useAppSettings();
  const [articles, setArticles] = useState<Article[]>(SEED_ARTICLES);
  const [refreshing, setRefreshing] = useState(false);

  const sorted = useMemo(() => [...articles].sort((a, b) => b.score - a.score), [articles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Curator/Discovery エージェントによる再スコアリングのシミュレーション。
    await new Promise((r) => setTimeout(r, 700));
    setArticles((prev) => prev.map((a) => ({ ...a, score: Math.min(10, Math.max(1, a.score + (Math.random() > 0.5 ? 1 : -1))) })));
    setRefreshing(false);
  }, []);

  return (
    <ScreenBackground>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.link}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title1}>{t(lang, 'dashboard_title')}</Text>
            <Text style={styles.subtitle}>{t(lang, 'dashboard_subtitle')} · {articles.length} articles</Text>
          </View>
        }
        renderItem={({ item }) => <ArticleCard article={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing(3) }} />}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { marginBottom: spacing(4) },
  title1: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textDim, marginTop: 4 },
  card: { gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 11, fontWeight: '700', color: colors.textDim, flexShrink: 1, marginRight: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  desc: { fontSize: 13, color: colors.textDim },
  reason: { fontSize: 12, color: colors.primaryAlt, marginTop: 2 },
});
