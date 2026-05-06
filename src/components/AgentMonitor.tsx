import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { AgentStatus } from '../types';
interface AgentMonitorProps {
  agents: AgentStatus[];
  compact?: boolean;
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({ agents, compact }) => {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        {agents.map((agent) => (
          <div key={agent.id} title={`${agent.name}: ${agent.lastMessage || 'Idle'}`} className="relative group">
            <StatusIcon status={agent.status} size={18} />
            {agent.status === 'working' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <GlassPanel className="p-4 flex flex-col gap-4">
// ...

      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Cpu size={14} />
          Agent Swarm
        </h2>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse delay-75" />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse delay-150" />
        </div>
      </div>

      <div className="space-y-3">
        {agents.map((agent) => (
          <div key={agent.id} className="space-y-1.5" data-testid={`agent-monitor-${agent.name}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-300">{agent.name}</span>
              <StatusIcon status={agent.status} />
            </div>
            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
              {agent.status === 'working' && (
                <motion.div 
                  className="absolute inset-0 bg-primary/40"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  agent.status === 'success' ? 'bg-accent w-full' : 
                  agent.status === 'error' ? 'bg-alert w-full' : 
                  agent.status === 'working' ? 'bg-primary w-2/3' : 'bg-slate-700 w-0'
                )}
              />
            </div>
            <p className="text-[10px] text-slate-500 truncate italic">
              {agent.lastMessage || 'Waiting for instructions...'}
            </p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
};

const StatusIcon = ({ status, size = 12 }: { status: AgentStatus['status'], size?: number }) => {
  switch (status) {
    case 'working':
      return <Loader2 size={size} className="text-primary animate-spin" />;
    case 'success':
      return <CheckCircle2 size={size} className="text-accent" />;
    case 'error':
      return <AlertCircle size={size} className="text-alert" />;
    default:
      return <div style={{ width: size, height: size }} className="rounded-full border border-slate-600" />;
  }
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
