import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Text } from 'react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AgentSwarmScreen } from '../screens/AgentSwarmScreen';
import { KnowledgeGraphScreen } from '../screens/KnowledgeGraphScreen';
import { NexusCommandScreen } from '../screens/NexusCommandScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme/theme';
import { useAppSettings } from '../hooks/useAppSettings';
import { t } from '../i18n';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Dashboard: '🛰️',
  Agents: '🤖',
  Graph: '🕸️',
  Nexus: '🧭',
  Settings: '⚙️',
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgAlt,
    text: colors.text,
    border: colors.surfaceBorder,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  const { lang } = useAppSettings();

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: { backgroundColor: colors.bgAlt, borderTopColor: colors.surfaceBorder },
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: t(lang, 'tab_dashboard') }} />
        <Tab.Screen name="Agents" component={AgentSwarmScreen} options={{ tabBarLabel: t(lang, 'tab_agents') }} />
        <Tab.Screen name="Graph" component={KnowledgeGraphScreen} options={{ tabBarLabel: t(lang, 'tab_graph') }} />
        <Tab.Screen name="Nexus" component={NexusCommandScreen} options={{ tabBarLabel: t(lang, 'tab_nexus') }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t(lang, 'tab_settings') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
