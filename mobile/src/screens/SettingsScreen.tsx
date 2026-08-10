import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/GlassCard';
import { colors, spacing } from '../theme/theme';
import { useAppSettings } from '../hooks/useAppSettings';
import { LLM_PROVIDERS, getProvider } from '../services/llm/providers';
import type { LLMProviderId } from '../types';
import { t } from '../i18n';

const PROVIDER_ORDER: LLMProviderId[] = ['gemini', 'claude', 'openai', 'ollama'];

export function SettingsScreen() {
  const { lang, setLang, llmConfig, setLlmConfig, apiKey, setApiKey } = useAppSettings();
  const [model, setModel] = useState(llmConfig.model);
  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl ?? '');
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [testing, setTesting] = useState(false);

  const provider = getProvider(llmConfig);

  const selectProvider = (id: LLMProviderId) => {
    const next = LLM_PROVIDERS[id];
    setLlmConfig({ provider: id, model: next.defaultModel, baseUrl: id === 'ollama' ? 'http://localhost:11434' : undefined });
    setModel(next.defaultModel);
    setBaseUrl(id === 'ollama' ? 'http://localhost:11434' : '');
    setKeyDraft('');
  };

  const save = () => {
    setLlmConfig({ ...llmConfig, model, baseUrl: baseUrl || undefined });
    setApiKey(keyDraft);
    Alert.alert(t(lang, 'settings_saved'));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { text } = await provider.chat({
        apiKey: keyDraft || undefined,
        model,
        baseUrl: baseUrl || undefined,
        system: 'You are a connectivity test responder.',
        prompt: 'Reply with the single word: OK',
      });
      Alert.alert(t(lang, 'settings_test_ok'), text.slice(0, 120));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title1}>{t(lang, 'settings_title')}</Text>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>Language / 言語</Text>
          <View style={styles.segment}>
            {(['ja', 'en'] as const).map((l) => (
              <Pressable key={l} style={[styles.segmentItem, lang === l && styles.segmentItemActive]} onPress={() => setLang(l)}>
                <Text style={[styles.segmentText, lang === l && styles.segmentTextActive]}>{l === 'ja' ? '日本語' : 'English'}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.label}>{t(lang, 'settings_provider')}</Text>
          <View style={styles.providerGrid}>
            {PROVIDER_ORDER.map((id) => (
              <Pressable
                key={id}
                style={[styles.providerChip, llmConfig.provider === id && styles.providerChipActive]}
                onPress={() => selectProvider(id)}
              >
                <Text style={[styles.providerText, llmConfig.provider === id && styles.providerTextActive]}>{LLM_PROVIDERS[id].label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t(lang, 'settings_model')}</Text>
          <TextInput value={model} onChangeText={setModel} style={styles.input} placeholderTextColor={colors.textFaint} />

          {llmConfig.provider === 'ollama' || llmConfig.provider === 'openai' ? (
            <>
              <Text style={styles.label}>Base URL</Text>
              <TextInput value={baseUrl} onChangeText={setBaseUrl} style={styles.input} autoCapitalize="none" placeholderTextColor={colors.textFaint} />
            </>
          ) : null}

          {provider.requiresApiKey && (
            <>
              <Text style={styles.label}>{t(lang, 'settings_apikey')}</Text>
              <TextInput
                value={keyDraft}
                onChangeText={setKeyDraft}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                placeholder={t(lang, 'settings_apikey_placeholder')}
                placeholderTextColor={colors.textFaint}
              />
            </>
          )}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.buttonPrimary]} onPress={save}>
              <Text style={styles.buttonText}>{t(lang, 'settings_save')}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={testConnection} disabled={testing}>
              {testing ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>{t(lang, 'settings_test')}</Text>}
            </Pressable>
          </View>
        </GlassCard>

        <Text style={styles.footnote}>APIキーは端末の Keychain / Keystore（expo-secure-store）に安全に保存され、外部へ送信されることはありません。</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing(4), paddingBottom: spacing(12), gap: spacing(4) },
  title1: { fontSize: 26, fontWeight: '800', color: colors.text },
  card: { gap: spacing(3) },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textDim, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#fff' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.surfaceBorder },
  providerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  providerText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  providerTextActive: { color: '#fff' },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, color: colors.text, backgroundColor: 'rgba(255,255,255,0.08)' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing(2) },
  button: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  footnote: { color: colors.textFaint, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing(4) },
});
