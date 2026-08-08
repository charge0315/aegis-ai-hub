import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Key, 
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Rocket,
  Cpu,
  Server,
  Network
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';
import type { UiSettings, Credentials } from '../../types';

interface SystemSettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  credentials?: Credentials;
  setCredentials?: (creds: Credentials) => void;
  handleSaveCredentials?: (creds: Credentials) => Promise<void>;
  isSavingApiKey: boolean;
  isSaving: boolean;
  handleSaveApiKey: () => Promise<void>;
  handleResetToDefaults: () => Promise<void>;
  theme: UiSettings['theme'];
  setTheme: (theme: UiSettings['theme']) => void;
  autoLaunch: boolean;
  setAutoLaunch: (enabled: boolean) => void;
  isReacquiring: boolean;
  handleReacquireAllFeeds: () => Promise<void>;
}

const PROVIDER_MODELS = {
  google: ['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-3.6-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-opus-latest', 'claude-3-5-haiku-latest'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'gpt-oss-120b'],
  ollama: ['llama3', 'llama3.1', 'mistral', 'phi3', 'gemma2']
};

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  setApiKey,
  credentials,
  handleSaveCredentials,
  isSavingApiKey,
  isSaving,
  handleSaveApiKey,
  handleResetToDefaults,
  theme,
  setTheme,
  autoLaunch,
  setAutoLaunch,
  isReacquiring,
  handleReacquireAllFeeds
}) => {
  // Local state for credentials editing
  const [localCreds, setLocalCreds] = useState<Credentials>({
    activeProvider: 'google',
    activeModel: 'gemini-3.5-flash',
    google: {},
    anthropic: {},
    openai: {},
    ollama: { baseUrl: 'http://localhost:11434' }
  });

  // Sync from props
  useEffect(() => {
    if (credentials) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalCreds(credentials);
    }
  }, [credentials]);

  const activeProvider = localCreds.activeProvider;
  const activeModel = localCreds.activeModel;

  const handleProviderChange = (prov: Credentials['activeProvider']) => {
    const defaultModel = PROVIDER_MODELS[prov][0];
    setLocalCreds(prev => ({
      ...prev,
      activeProvider: prov,
      activeModel: defaultModel
    }));
  };

  const handleModelSelect = (val: string) => {
    if (val === 'custom') {
      return; // Do nothing, let user type in custom text input
    }
    setLocalCreds(prev => ({
      ...prev,
      activeModel: val
    }));
  };

  const handleModelTextChange = (val: string) => {
    setLocalCreds(prev => ({
      ...prev,
      activeModel: val
    }));
  };

  const handleApiKeyChange = (val: string) => {
    const prov = activeProvider;
    if (prov === 'ollama') return;

    setLocalCreds(prev => ({
      ...prev,
      geminiApiKey: prov === 'google' ? val : prev.geminiApiKey,
      [prov]: {
        ...prev[prov],
        apiKey: val
      }
    }));
  };

  const handleBaseUrlChange = (val: string) => {
    const prov = activeProvider;
    if (prov === 'google') return;

    setLocalCreds(prev => ({
      ...prev,
      [prov]: {
        ...prev[prov],
        baseUrl: val
      }
    }));
  };

  const getProviderIcon = (prov: Credentials['activeProvider']) => {
    switch (prov) {
      case 'google': return <Sparkles size={16} />;
      case 'anthropic': return <Cpu size={16} />;
      case 'openai': return <Network size={16} />;
      case 'ollama': return <Server size={16} />;
    }
  };

  const handleSave = async () => {
    if (handleSaveCredentials) {
      await handleSaveCredentials(localCreds);
    } else {
      // Fallback to legacy single key save
      const keyToSave = localCreds.google?.apiKey || localCreds.geminiApiKey || '';
      setApiKey(keyToSave);
      await handleSaveApiKey();
    }
  };

  const isCustomModel = !PROVIDER_MODELS[activeProvider].includes(activeModel);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      {/* System Behavior: OSとの連携設定 */}
      <GlassPanel className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
            <Rocket size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-content-base">System Behavior</h3>
            <p className="text-sm text-content-muted">Configure how the application interacts with your OS.</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-content-base">Auto Launch on Startup</h4>
            <p className="text-xs text-content-muted">Automatically start Aegis Nexus when you log into Windows.</p>
          </div>
          <button
            onClick={() => setAutoLaunch(!autoLaunch)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              autoLaunch ? 'bg-primary' : 'bg-content-muted/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoLaunch ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </GlassPanel>

      {/* Theme Customization: 視覚体験のパーソナライズ */}
      <GlassPanel className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-content-base">Visual Experience</h3>
            <p className="text-sm text-content-muted">Customize how Aegis Nexus appears on your desktop.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
            Interface Theme
          </label>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption 
              active={theme === 'light'} 
              onClick={() => setTheme('light')}
              icon={<Sun size={20} />}
              label="Light"
            />
            <ThemeOption 
              active={theme === 'dark'} 
              onClick={() => setTheme('dark')}
              icon={<Moon size={20} />}
              label="Dark"
            />
            <ThemeOption 
              active={theme === 'system'} 
              onClick={() => setTheme('system')}
              icon={<Monitor size={20} />}
              label="System"
            />
          </div>
          <p className="text-[10px] text-content-muted/60 px-1">
            "System" will automatically synchronize with your OS light/dark mode settings.
          </p>
        </div>
      </GlassPanel>

      {/* AI Intelligence Command Center: 多モデル・プロバイダー設定 */}
      <GlassPanel className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-content-base">AI Intelligence Command Center</h3>
            <p className="text-sm text-content-muted">Configure active LLM engines and credentials.</p>
          </div>
        </div>

        {/* AI Provider Select */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
            Active Provider
          </label>
          <div className="grid grid-cols-4 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            {(['google', 'anthropic', 'openai', 'ollama'] as const).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => handleProviderChange(prov)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                  activeProvider === prov
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-content-muted hover:text-content-base hover:bg-white/5'
                }`}
              >
                {getProviderIcon(prov)}
                {prov}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
              Select Preset Model
            </label>
            <select
              value={isCustomModel ? 'custom' : activeModel}
              onChange={(e) => handleModelSelect(e.target.value)}
              className="w-full bg-content-muted/10 border border-content-muted/20 rounded-xl px-4 py-3 text-content-base focus:outline-none focus:border-primary/50 transition-all"
            >
              {PROVIDER_MODELS[activeProvider].map(m => (
                <option key={m} value={m} className="bg-background-dark text-content-base">{m}</option>
              ))}
              <option value="custom" className="bg-background-dark text-content-base">Custom Model...</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
              Model Identifier
            </label>
            <input
              type="text"
              value={activeModel}
              onChange={(e) => handleModelTextChange(e.target.value)}
              placeholder="Model name"
              className="w-full bg-content-muted/10 border border-content-muted/20 rounded-xl px-4 py-3 text-content-base focus:outline-none focus:border-primary/50 transition-all font-mono"
            />
          </div>
        </div>

        {/* API Key */}
        {activeProvider !== 'ollama' && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
              API Key
            </label>
            <div className="relative group">
              <input
                type="password"
                value={activeProvider === 'google' ? (localCreds.google?.apiKey || localCreds.geminiApiKey || '') : (localCreds[activeProvider]?.apiKey || '')}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Paste your API key here"
                className="w-full bg-content-muted/10 border border-content-muted/20 rounded-xl px-4 py-3 text-content-base focus:outline-none focus:border-primary/50 transition-all font-mono"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
                <Key size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Base URL (Optional or Required for Ollama) */}
        {activeProvider !== 'google' && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
              {activeProvider === 'ollama' ? 'Ollama API Base URL' : 'Custom Base URL (Optional)'}
            </label>
            <input
              type="text"
              value={localCreds[activeProvider]?.baseUrl || ''}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder={activeProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
              className="w-full bg-content-muted/10 border border-content-muted/20 rounded-xl px-4 py-3 text-content-base focus:outline-none focus:border-primary/50 transition-all font-mono"
            />
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
          <p className="text-[10px] text-content-muted/60 max-w-sm">
            {activeProvider === 'google' && "Google API keys are stored securely using Windows safeStorage."}
            {activeProvider === 'anthropic' && "Anthropic keys are stored securely using Windows safeStorage."}
            {activeProvider === 'openai' && "OpenAI keys are stored securely using Windows safeStorage."}
            {activeProvider === 'ollama' && "Ollama runs completely locally on your system. No API key needed."}
          </p>
          <button
            onClick={handleSave}
            disabled={isSavingApiKey}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
          >
            <Save size={18} />
            {isSavingApiKey ? 'Saving...' : 'Apply Settings'}
          </button>
        </div>
      </GlassPanel>

      {/* Advanced System Actions: 重大な操作への注意喚起 */}
      <GlassPanel className="p-8 border-alert/20 bg-alert/5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-alert/10 text-alert rounded-2xl">
            <RotateCcw size={24} />
          </div>
          <div className="flex-grow space-y-6">
            <div>
              <h3 className="text-xl font-bold text-content-base">Advanced System Actions</h3>
              <p className="text-sm text-content-muted mt-1">Perform maintenance operations on the system database and feed configurations.</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleReacquireAllFeeds}
                disabled={isSaving || isReacquiring}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={18} />
                {isReacquiring ? 'Reacquiring...' : 'Reacquire All Feed Sources'}
              </button>

              <button
                onClick={handleResetToDefaults}
                disabled={isSaving || isReacquiring}
                className="flex items-center gap-2 px-6 py-2.5 bg-alert text-white rounded-xl text-sm font-bold shadow-lg shadow-alert/20 hover:shadow-alert/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw size={18} />
                Restore Default Profile
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* 外部リンクと補足情報 */}
      <div className="p-6 bg-background/50 border border-content-muted/20 rounded-2xl">
        <h4 className="text-sm font-bold text-content-base mb-2">Usage Note</h4>
        <p className="text-xs text-content-muted leading-relaxed">
          Aegis Nexus requires a valid LLM setup to perform intelligent news curation, category analysis, and autonomous site discovery. Google AI Studio keys can be obtained for free. Local Ollama endpoints can also be connected.
        </p>
      </div>
    </motion.div>
  );
};

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ThemeOption: React.FC<ThemeOptionProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
      active 
        ? 'bg-primary/10 border-primary text-content-base shadow-lg shadow-primary/10' 
        : 'bg-content-muted/10 border-content-muted/20 text-content-muted hover:border-content-muted/20 hover:text-content-base'
    }`}
  >
    <div className={active ? 'text-primary' : 'text-content-muted'}>
      {icon}
    </div>
    <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
  </button>
);
