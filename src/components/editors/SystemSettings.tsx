import React from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Key, 
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Rocket
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';
import type { UiSettings } from '../../types';

interface SystemSettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  isSavingApiKey: boolean;
  isSaving: boolean;
  handleSaveApiKey: () => Promise<void>;
  handleResetToDefaults: () => Promise<void>;
  theme: UiSettings['theme'];
  setTheme: (theme: UiSettings['theme']) => void;
  autoLaunch: boolean;
  setAutoLaunch: (enabled: boolean) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  apiKey,
  setApiKey,
  isSavingApiKey,
  isSaving,
  handleSaveApiKey,
  handleResetToDefaults,
  theme,
  setTheme,
  autoLaunch,
  setAutoLaunch
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      {/* System Behavior */}
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

      {/* Theme Customization */}
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

      <GlassPanel className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-content-base">Gemini API Intelligence</h3>
            <p className="text-sm text-content-muted">Securely manage your Google Gemini API credentials.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-content-muted uppercase tracking-widest px-1">
            Gemini API Key
          </label>
          <div className="relative group">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-content-muted/10 border border-content-muted/20 rounded-xl px-4 py-3 text-content-base focus:outline-none focus:border-primary/50 transition-all font-mono"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
              <Key size={16} />
            </div>
          </div>
          <p className="text-[10px] text-content-muted/60 px-1">
            Your key is stored locally on this machine. It is never transmitted except to Google Gemini API endpoints.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveApiKey}
            disabled={isSavingApiKey}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 disabled:opacity-50"
          >
            <Save size={18} />
            {isSavingApiKey ? 'Saving...' : 'Apply API Key'}
          </button>
        </div>
      </GlassPanel>

      {/* Advanced System Actions */}
      <GlassPanel className="p-8 border-alert/20 bg-alert/5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-alert/10 text-alert rounded-2xl">
            <RotateCcw size={24} />
          </div>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-content-base">Factory Reset</h3>
            <p className="text-sm text-content-muted mt-1">Restore the default intelligence profile and feed sources.</p>
            <div className="mt-6">
              <button
                onClick={handleResetToDefaults}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-alert text-white rounded-xl text-sm font-bold shadow-lg shadow-alert/20 hover:shadow-alert/40 transition-all active:scale-95 disabled:opacity-50"
              >
                <RotateCcw size={18} />
                Restore Default Profile
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>

      <div className="p-6 bg-background/50 border border-content-muted/20 rounded-2xl">
        <h4 className="text-sm font-bold text-content-base mb-2">Usage Note</h4>
        <p className="text-xs text-content-muted leading-relaxed">
          Aegis Nexus requires a valid Gemini API Key to perform intelligent news curation, category analysis, and autonomous site discovery. You can obtain a key for free at the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
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
