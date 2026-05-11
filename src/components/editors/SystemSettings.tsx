import React from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Key, 
  RotateCcw
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';

interface SystemSettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  isSavingApiKey: boolean;
  isSaving: boolean;
  handleSaveApiKey: () => Promise<void>;
  handleResetToDefaults: () => Promise<void>;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  apiKey,
  setApiKey,
  isSavingApiKey,
  isSaving,
  handleSaveApiKey,
  handleResetToDefaults
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <GlassPanel className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Gemini API Intelligence</h3>
            <p className="text-sm text-slate-500">Securely manage your Google Gemini API credentials.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            Gemini API Key
          </label>
          <div className="relative group">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all font-mono"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50">
              <Key size={16} />
            </div>
          </div>
          <p className="text-[10px] text-slate-600 px-1">
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
            <h3 className="text-xl font-bold text-white">Factory Reset</h3>
            <p className="text-sm text-slate-500 mt-1">Restore the default intelligence profile and feed sources.</p>
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

      <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
        <h4 className="text-sm font-bold text-slate-300 mb-2">Usage Note</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Aegis Nexus requires a valid Gemini API Key to perform intelligent news curation, category analysis, and autonomous site discovery. You can obtain a key for free at the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
        </p>
      </div>
    </motion.div>
  );
};
