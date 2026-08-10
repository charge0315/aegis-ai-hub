import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/theme';
import type { AgentRunStatus } from '../types';

const STATUS_LABEL: Record<AgentRunStatus, string> = {
  idle: 'Idle',
  working: 'Working',
  success: 'Success',
  error: 'Error',
};

const STATUS_COLOR: Record<AgentRunStatus, string> = {
  idle: colors.textFaint,
  working: colors.warning,
  success: colors.success,
  error: colors.danger,
};

export function AgentStatusPill({ status }: { status: AgentRunStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '700' },
});
