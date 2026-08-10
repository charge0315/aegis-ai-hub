import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppSettingsProvider } from './src/hooks/AppSettingsProvider';
import { useAppSettings } from './src/hooks/useAppSettings';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/theme';

function Gate() {
  const { ready } = useAppSettings();
  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <StatusBar style="light" />
        <Gate />
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
