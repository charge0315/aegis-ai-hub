import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/theme';

export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? colors.success : score >= 5 ? colors.warning : colors.textDim;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: { fontWeight: '800', fontSize: 13 },
});
