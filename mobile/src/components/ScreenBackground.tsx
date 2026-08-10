import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gradients } from '../theme/theme';

/** 全画面共通の背景グラデーション + SafeArea ラッパー。 */
export function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
