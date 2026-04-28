import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, BookOpen } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  agent: string;
  type: 'tool' | 'action' | 'logic';
}

const skills: Skill[] = [
  { id: 'rss-fetch', name: 'RSS Fetcher', description: 'Retrieves raw signals from configured sources with deduplication.', agent: 'Discovery', type: 'tool' },
  { id: 'semantic-filter', name: 'Semantic Filter', description: 'Analyzes article relevance using Gemini 3.1 embeddings.', agent: 'Architect', type: 'logic' },
  { id: 'entity-extract', name: 'Entity Extraction', description: 'Identifies brands and keywords within text content.', agent: 'Curator', type: 'tool' },
  { id: 'version-sync', name: 'Version Control Sync', description: 'Safely commits interest changes to the persistent layer.', agent: 'Archivist', type: 'action' },
  { id: 'site-discovery', name: 'Source Discovery', description: 'Finds new authoritative RSS feeds based on current interests.', agent: 'Discovery', type: 'action' },
  { id: 'reasoning-gen', name: 'Reasoning Engine', description: 'Generates user-friendly explanations for curated content.', agent: 'Curator', type: 'logic' },
];

export const SkillRegistry: React.FC = () => {
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
            className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {skill.type === 'tool' ? <Terminal size={20} /> : 
                 skill.type === 'action' ? <Zap size={20} /> : 
                 <Shield size={20} />}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-200">{skill.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full uppercase font-mono">
                    {skill.agent}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {skill.description}
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">
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
          Skills are dynamically allocated by the <span className="text-primary font-bold">Orchestrator</span> based on task complexity.
          MCP Tools are compliant with the Model Context Protocol v1.2.
        </div>
      </div>
    </div>
  );
};
