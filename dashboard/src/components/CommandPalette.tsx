import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Command, 
  Settings, 
  LayoutDashboard, 
  ArrowRight,
  ChevronRight,
  Globe,
  Tag,
  Cpu
} from 'lucide-react';
import type { NexusSettings } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NexusSettings | null;
  onNavigate: (view: 'feed' | 'settings', category?: string) => void;
  onSync: () => Promise<void>;
  onTriggerOrchestration: (requirements: string) => Promise<void>;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'action' | 'category';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  settings,
  onNavigate,
  onSync,
  onTriggerOrchestration
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = settings ? Object.keys(settings.interests.categories) : [];

  const commands: CommandItem[] = [
    {
      id: 'go-feed',
      title: 'Go to Intelligence Feed',
      subtitle: 'View your personalized news stream',
      icon: <LayoutDashboard size={18} />,
      action: () => onNavigate('feed'),
      category: 'navigation'
    },
    {
      id: 'go-settings',
      title: 'Open Nexus Settings',
      subtitle: 'Configure categories, brands and keywords',
      icon: <Settings size={18} />,
      action: () => onNavigate('settings'),
      category: 'navigation'
    },
    {
      id: 'sync-now',
      title: 'Force Sync Settings',
      subtitle: 'Immediately push local changes to server',
      icon: <Globe size={18} />,
      action: () => {
        void onSync();
      },
      category: 'action'
    },
    {
      id: 'trigger-ai',
      title: 'Command Agents: Regenerate',
      subtitle: 'Trigger full orchestration for new insights',
      icon: <Cpu size={18} />,
      action: () => {
        void onTriggerOrchestration("Refresh and find new insights based on current interests.");
      },
      category: 'action'
    },
    ...categories.map(cat => ({
      id: `cat-${cat}`,
      title: `Jump to ${cat}`,
      subtitle: `Filter feed by ${cat} category`,
      icon: <Tag size={18} />,
      action: () => onNavigate('feed', cat),
      category: 'category' as const
    }))
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      // Use a small timeout to avoid synchronous setState during effect
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="command-palette-overlay"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-start justify-center pt-24 z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              data-testid="command-palette"
              className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <Search size={20} className="text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to do?"
                  data-testid="command-palette-input"
                  className="bg-transparent border-none outline-none text-slate-100 text-lg w-full placeholder:text-slate-500"
                />
                <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-slate-500 border border-white/5">
                  ESC
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {filteredCommands.length > 0 ? (
                  <div className="space-y-1">
                    {filteredCommands.map((cmd, idx) => (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                          idx === selectedIndex 
                            ? 'bg-primary/20 text-white shadow-lg ring-1 ring-primary/30' 
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${idx === selectedIndex ? 'bg-primary/20 text-primary' : 'bg-white/5'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-grow text-left">
                          <div className={`text-sm font-semibold ${idx === selectedIndex ? 'text-white' : 'text-slate-200'}`}>
                            {cmd.title}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {cmd.subtitle}
                          </div>
                        </div>
                        {idx === selectedIndex && (
                          <motion.div layoutId="arrow" initial={{ x: -5 }} animate={{ x: 0 }}>
                            <ChevronRight size={18} className="text-primary" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    No commands found for "{query}"
                  </div>
                )}
              </div>

              <div className="p-3 bg-black/20 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><ArrowRight size={10} className="rotate-90" /> Select</span>
                  <span className="flex items-center gap-1.5"><Command size={10} /> Enter to Run</span>
                </div>
                <div>
                  Aegis Command Center v1.0
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
