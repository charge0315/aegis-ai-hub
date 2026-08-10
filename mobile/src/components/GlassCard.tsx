import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

/** Acrylic Glassmorphism カード。デスクトップ版 Aegis Chroma UI の質感をモバイルに再現。 */
export function GlassCard({ children, style, intensity = 30 }: GlassCardProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
  },
});
