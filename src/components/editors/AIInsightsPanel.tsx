import React from 'react';
import { 
  Plus, 
  Trash2,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';
import type { Interests } from '../../models/Schemas';

interface AIInsightsPanelProps {
  draft: { interests: Interests };
  isDiscovering: boolean;
  handleDiscoverTrends: () => Promise<void>;
  handlePromoteKeyword: (keyword: string, category: string) => void;
  handleDismissKeyword: (keyword: string) => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  draft,
  isDiscovering,
  handleDiscoverTrends,
  handlePromoteKeyword,
  handleDismissKeyword
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold text-content-base flex items-center gap-2">
            <Sparkles size={24} className="text-primary" />
            AI Intelligence Insights
          </h3>
          <p className="text-content-muted text-sm mt-1">Autonomous agents analyzing signals for emerging patterns and breakthrough concepts.</p>
        </div>
        <button
          onClick={handleDiscoverTrends}
          disabled={isDiscovering}
          data-testid="discover-trends-button"
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
            isDiscovering 
              ? 'bg-primary/20 text-primary cursor-not-allowed' 
              : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
          }`}
        >
          {isDiscovering ? (
            <>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Analyzing Feeds...
            </>
          ) : (
            <>
              <Zap size={18} />
              Discover Trends Now
            </>
          )}
        </button>
      </div>

      {!draft.interests.learned_keywords || Object.keys(draft.interests.learned_keywords).length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-content-muted/10 rounded-[2.5rem] bg-surface-panel/5">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-pulse">
            <TrendingUp size={40} />
          </div>
          <h4 className="text-xl font-bold text-content-base mb-2">No active trends detected</h4>
          <p className="text-content-muted text-center max-w-md px-6">
            Click the discovery button above to have the <span className="text-primary font-bold">Archivist</span> scan your current feeds for new signals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(draft.interests.learned_keywords).map(([kw, data]) => (
            <GlassPanel key={kw} className="p-0 overflow-hidden group hover:border-primary/40 transition-all duration-500">
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider ${
                        data.type === 'breakthrough' ? 'bg-orange-500/20 text-orange-400' :
                        data.type === 'emerging' ? 'bg-emerald-500/20 text-emerald-400' :
                        data.type === 'niche' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {data.type || 'Standard'}
                      </span>
                      <span className="px-2 py-0.5 bg-surface-panel/10 text-content-muted text-[10px] font-bold uppercase rounded-md">
                        {data.category}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black text-content-base group-hover:text-primary transition-colors">{kw}</h4>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-[10px] font-mono text-content-muted/60">Detected: {new Date(data.detectedAt).toLocaleDateString()}</div>
                    <div className="flex items-center justify-end gap-1 text-primary">
                      <Target size={12} />
                      <span className="text-xs font-bold font-mono">{data.confidence || 85}% Confidence</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-content-muted leading-relaxed border-l-2 border-primary/20 pl-4 py-1">
                  {data.reason}
                </p>

                {data.context && (
                  <div className="p-3 bg-content-muted/5 rounded-xl text-[11px] text-content-muted italic leading-relaxed border border-content-muted/5">
                    <BarChart3 size={14} className="mb-1 opacity-50" />
                    "{data.context.length > 150 ? data.context.substring(0, 150) + '...' : data.context}"
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handlePromoteKeyword(kw, data.category)}
                    data-testid="promote-trend-button"
                    className="flex-grow flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Plus size={16} /> Promote to Keyword
                  </button>
                  <button
                    onClick={() => handleDismissKeyword(kw)}
                    data-testid="dismiss-trend-button"
                    className="px-5 py-3 bg-surface-panel/10 hover:bg-alert/10 text-content-muted hover:text-alert rounded-2xl text-sm font-bold transition-all border border-transparent hover:border-alert/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="h-1 w-full bg-surface-panel/10 relative overflow-hidden">
                <div 
                  style={{ width: `${data.confidence || 85}%` }}
                  className={`absolute inset-y-0 left-0 ${
                    data.type === 'breakthrough' ? 'bg-orange-500' :
                    data.type === 'emerging' ? 'bg-emerald-500' :
                    'bg-primary'
                  }`}
                />
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] flex items-start gap-4">
        <div className="p-2 bg-primary/10 text-primary rounded-xl"><Sparkles size={24} /></div>
        <div className="space-y-1">
          <h5 className="text-sm font-bold text-content-base">Continuous Learning Engine</h5>
          <p className="text-xs text-content-muted leading-relaxed">
            The <span className="text-primary font-bold">Archivist</span> agent monitors signal entropy across your clusters. 
            When persistent patterns emerge that aren't yet in your knowledge base, they are presented here for validation. 
            Promoting a trend permanently increases the priority of related signals in all future curation cycles.
          </p>
        </div>
      </div>
    </div>
  );
};
