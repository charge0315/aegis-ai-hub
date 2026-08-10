import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { ScreenBackground } from '../components/ScreenBackground';
import { agentColors, colors, spacing } from '../theme/theme';
import { SEED_ARTICLES } from '../data/sampleArticles';
import { useAppSettings } from '../hooks/useAppSettings';
import { t } from '../i18n';

const PALETTE = [colors.primary, colors.success, colors.warning, colors.primaryAlt, agentColors.discovery];

export function KnowledgeGraphScreen() {
  const { lang, interests } = useAppSettings();
  const size = Math.min(Dimensions.get('window').width - spacing(8), 360);
  const center = size / 2;
  const radius = size / 2 - 40;

  const nodes = useMemo(() => {
    const categories = interests.length > 0 ? interests : [{ id: 'general', emoji: '✦', label: 'General', keywords: [] }];
    return categories.map((cat, i) => {
      const angle = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
      const count = SEED_ARTICLES.filter((a) => a.category === cat.label).length;
      return {
        id: cat.id,
        label: `${cat.emoji} ${cat.label}`,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        weight: 10 + count * 6,
        color: PALETTE[i % PALETTE.length],
      };
    });
  }, [interests, center, radius]);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title1}>{t(lang, 'graph_title')}</Text>
        <View style={styles.graphWrap}>
          <Svg width={size} height={size}>
            {nodes.map((n) => (
              <Line key={`line-${n.id}`} x1={center} y1={center} x2={n.x} y2={n.y} stroke={colors.surfaceBorder} strokeWidth={1.5} />
            ))}
            <Circle cx={center} cy={center} r={22} fill={colors.primary} />
            <SvgText x={center} y={center + 4} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle">
              YOU
            </SvgText>
            {nodes.map((n) => (
              <React.Fragment key={n.id}>
                <Circle cx={n.x} cy={n.y} r={n.weight} fill={n.color} opacity={0.85} />
                <SvgText x={n.x} y={n.y + n.weight + 14} fontSize={11} fill={colors.text} textAnchor="middle">
                  {n.label}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </View>
        <Text style={styles.hint}>ノードの大きさは関連記事数を表します。ネクサス・コマンドでカテゴリを編集するとグラフが更新されます。</Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing(4), alignItems: 'center' },
  title1: { fontSize: 24, fontWeight: '800', color: colors.text, alignSelf: 'flex-start', marginBottom: spacing(6) },
  graphWrap: { alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: spacing(8), paddingHorizontal: spacing(4) },
});
