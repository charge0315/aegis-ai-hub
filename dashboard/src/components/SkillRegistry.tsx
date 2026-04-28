import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import type { Skill } from '../types';

interface SkillRegistryProps {
  skills?: Skill[];
  onToggleSkill?: (skillId: string) => void;
}

const defaultSkills: Skill[] = [
  { id: 'rss-fetch', name: 'RSS Fetcher', description: 'Retrieves raw signals from configured sources with deduplication.', agent: 'Discovery', type: 'tool', enabled: true },
  { id: 'semantic-filter', name: 'Semantic Filter', description: 'Analyzes article relevance using Gemini 3.1 embeddings.', agent: 'Architect', type: 'logic', enabled: true },
  { id: 'entity-extract', name: 'Entity Extraction', description: 'Identifies brands and keywords within text content.', agent: 'Curator', type: 'tool', enabled: true },
  { id: 'version-sync', name: 'Version Control Sync', description: 'Safely commits interest changes to the persistent layer.', agent: 'Archivist', type: 'action', enabled: true },
  { id: 'site-discovery', name: 'Source Discovery', description: 'Finds new authoritative RSS feeds based on current interests.', agent: 'Discovery', type: 'action', enabled: true },
  { id: 'reasoning-gen', name: 'Reasoning Engine', description: 'Generates user-friendly explanations for curated content.', agent: 'Curator', type: 'logic', enabled: true },
];

export const SkillRegistry: React.FC<SkillRegistryProps> = ({ 
  skills = defaultSkills,
  onToggleSkill
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Agent Skill Registry</h3>
          <p className="text-slate-500 text-sm">Capabilities currently deployed in the Aegis MCP cluster.</p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
            {skills.length} Skills Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {skills.map((skill, idx) => (
          <motion.div
            key={skill.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onToggleSkill?.(skill.id)}
            className={`p-5 border rounded-2xl transition-all cursor-pointer group ${
              skill.enabled 
                ? 'bg-white/5 border-white/10 hover:border-primary/50' 
                : 'bg-black/40 border-white/5 opacity-50 grayscale'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                skill.enabled ? 'bg-slate-800 text-primary' : 'bg-slate-900 text-slate-600'
              }`}>
                {skill.type === 'tool' ? <Terminal size={20} /> : 
                 skill.type === 'action' ? <Zap size={20} /> : 
                 <Shield size={20} />}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-bold ${skill.enabled ? 'text-slate-200' : 'text-slate-500'}`}>{skill.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full uppercase font-mono">
                      {skill.agent}
                    </span>
                    {skill.enabled ? 
                      <CheckCircle2 size={14} className="text-primary" /> : 
                      <Circle size={14} className="text-slate-600" />
                    }
                  </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {skill.description}
                </p>
                <div className="mt-3 flex gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    skill.enabled ? 'text-primary/70' : 'text-slate-700'
                  }`}>
                    {skill.type}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4">
        <div className="text-primary"><BookOpen size={20} /></div>
        <div className="text-xs text-slate-400">
          Click a skill to toggle its availability. Disabling a skill will prevent the <span className="text-primary font-bold">Orchestrator</span> from utilizing that logic for next intelligence cycle.
        </div>
      </div>
    </div>
  );
};
