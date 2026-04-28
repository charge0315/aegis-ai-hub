import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RotateCcw, 
  Plus, 
  Settings2, 
  Globe, 
  Hash, 
  Network, 
  Cpu, 
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { KnowledgeGraph } from './KnowledgeGraph';
import { SkillRegistry } from './SkillRegistry';
import type { NexusSettings, Skill } from '../types';

interface UnifiedEditorProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
}

type Tab = 'editor' | 'graph' | 'skills';

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({ 
  currentSettings, 
  onSave 
}) => {
  const [draft, setDraft] = useState<NexusSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    Object.keys(currentSettings.interests.categories)[0] || null
  );

  const isDirty = JSON.stringify(draft) !== JSON.stringify(currentSettings);

  const handleAddCategory = () => {
    const name = window.prompt('Enter new category name:');
    if (!name) return;
    if (draft.interests.categories[name]) {
      alert('Category already exists.');
      return;
    }
    setDraft(prev => ({
      ...prev,
      interests: {
        ...prev.interests,
        categories: {
          ...prev.interests.categories,
          [name]: {
            emoji: '🆕',
            brands: [],
            keywords: [],
            score: 5,
            reason: 'Manually added category.'
          }
        }
      }
    }));
    setSelectedCategory(name);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
      alert('Configuration saved successfully!');
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(currentSettings);
  };

  const handleKeywordToggle = (category: string, keyword: string, enabled: boolean) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      const cat = { ...newCategories[category] };
      if (enabled) {
        if (!cat.keywords.includes(keyword)) cat.keywords = [...cat.keywords, keyword];
      } else {
        cat.keywords = cat.keywords.filter(k => k !== keyword);
      }
      newCategories[category] = cat;
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  };

  const handleBrandToggle = (category: string, brand: string, enabled: boolean) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      const cat = { ...newCategories[category] };
      if (enabled) {
        if (!cat.brands.includes(brand)) cat.brands = [...cat.brands, brand];
      } else {
        cat.brands = cat.brands.filter(b => b !== brand);
      }
      newCategories[category] = cat;
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  };

  const handleToggleSkill = (skillId: string) => {
    setDraft(prev => {
      const defaultSkills: Skill[] = [
        { id: 'rss-fetch', name: 'RSS Fetcher', description: 'Retrieves raw signals from configured sources with deduplication.', agent: 'Discovery', type: 'tool', enabled: true },
        { id: 'semantic-filter', name: 'Semantic Filter', description: 'Analyzes article relevance using Gemini 3.1 embeddings.', agent: 'Architect', type: 'logic', enabled: true },
        { id: 'entity-extract', name: 'Entity Extraction', description: 'Identifies brands and keywords within text content.', agent: 'Curator', type: 'tool', enabled: true },
        { id: 'version-sync', name: 'Version Control Sync', description: 'Safely commits interest changes to the persistent layer.', agent: 'Archivist', type: 'action', enabled: true },
        { id: 'site-discovery', name: 'Source Discovery', description: 'Finds new authoritative RSS feeds based on current interests.', agent: 'Discovery', type: 'action', enabled: true },
        { id: 'reasoning-gen', name: 'Reasoning Engine', description: 'Generates user-friendly explanations for curated content.', agent: 'Curator', type: 'logic', enabled: true },
      ];
      const currentSkills = prev.interests.skills || defaultSkills;
      const newSkills = currentSkills.map(s => 
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, interests: { ...prev.interests, skills: newSkills } };
    });
  };

  const handleDeleteCategory = (catName: string) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      delete newCategories[catName];
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
    if (selectedCategory === catName) {
      const keys = Object.keys(draft.interests.categories);
      const remaining = keys.filter(k => k !== catName);
      setSelectedCategory(remaining[0] || null);
    }
  };

  const handleMoveCategory = (catName: string, direction: 'up' | 'down') => {
    setDraft(prev => {
      const keys = Object.keys(prev.interests.categories);
      const index = keys.indexOf(catName);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= keys.length) return prev;
      
      const newKeys = [...keys];
      [newKeys[index], newKeys[newIndex]] = [newKeys[newIndex], newKeys[index]];
      
      const newCategories: any = {};
      newKeys.forEach(k => {
        newCategories[k] = prev.interests.categories[k];
      });
      
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  };

  const handleUpdateCategory = (name: string, field: 'brands' | 'keywords', values: string[]) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[name] = { ...newCategories[name], [field]: values };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Settings2 size={24} />
            </div>
            Nexus Command & Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure intelligence parameters, visualize knowledge, and manage agent skills.</p>
        </div>
        
        <div className="flex gap-3">
          {isDirty && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleReset}
              data-testid="reset-draft-button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={16} />
              Reset Draft
            </motion.button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            data-testid="save-settings-button"
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
          >
            <Save size={18} />
            {isSaving ? 'Synchronizing...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-8">
        <TabButton 
          active={activeTab === 'editor'} 
          onClick={() => setActiveTab('editor')} 
          icon={<Edit3 size={18} />} 
          label="Nexus Editor" 
          data-testid="tab-editor"
        />
        <TabButton 
          active={activeTab === 'graph'} 
          onClick={() => setActiveTab('graph')} 
          icon={<Network size={18} />} 
          label="Knowledge Graph" 
          data-testid="tab-graph"
        />
        <TabButton 
          active={activeTab === 'skills'} 
          onClick={() => setActiveTab('skills')} 
          icon={<Cpu size={18} />} 
          label="Skill Registry" 
          data-testid="tab-skills"
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Category Sidebar */}
              <div className="lg:col-span-3 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-3">
                  Intelligence Categories
                </div>
                {Object.keys(draft.interests.categories).map((catName, idx, arr) => (
                  <div key={catName} className="group relative flex items-center gap-1">
                    <button
                      onClick={() => setSelectedCategory(catName)}
                      className={`flex-grow flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedCategory === catName 
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' 
                          : 'text-slate-400 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="text-xl">{draft.interests.categories[catName].emoji}</span>
                      <span className="font-semibold truncate">{catName}</span>
                    </button>
                    
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(catName, 'up')}
                        className="p-1 hover:text-white disabled:text-slate-700 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button 
                        disabled={idx === arr.length - 1}
                        onClick={() => handleMoveCategory(catName, 'down')}
                        className="p-1 hover:text-white disabled:text-slate-700 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(catName)}
                        className="p-1 text-slate-600 hover:text-alert transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={handleAddCategory}
                  className="w-full flex items-center gap-3 p-3 text-slate-500 hover:text-accent hover:bg-accent/5 rounded-xl border border-dashed border-white/10 transition-all mt-4"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">Add New Category</span>
                </button>
              </div>

              {/* Editor Area */}
              <div className="lg:col-span-9 space-y-6">
                {selectedCategory && draft.interests.categories[selectedCategory] ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Brands Section */}
                      <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold flex items-center gap-2">
                            <Globe size={18} className="text-primary" />
                            Target Brands
                          </h3>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {draft.interests.categories[selectedCategory].brands.length} Total
                          </span>
                        </div>
                        <div className="space-y-3">
                          {draft.interests.categories[selectedCategory].brands.map((brand, idx) => (
                            <div key={idx} className="group flex items-center gap-2">
                              <input 
                                type="text"
                                value={brand}
                                onChange={(e) => {
                                  const newBrands = [...draft.interests.categories[selectedCategory].brands];
                                  newBrands[idx] = e.target.value;
                                  handleUpdateCategory(selectedCategory, 'brands', newBrands);
                                }}
                                className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                              />
                              <button 
                                onClick={() => {
                                  const newBrands = draft.interests.categories[selectedCategory].brands.filter((_, i) => i !== idx);
                                  handleUpdateCategory(selectedCategory, 'brands', newBrands);
                                }}
                                className="p-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-alert transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newBrands = [...draft.interests.categories[selectedCategory].brands, ''];
                              handleUpdateCategory(selectedCategory, 'brands', newBrands);
                            }}
                            className="w-full py-2 border border-dashed border-white/10 rounded-lg text-slate-500 hover:text-primary hover:border-primary/50 text-xs font-medium transition-all"
                          >
                            + Add Brand
                          </button>
                        </div>
                      </GlassPanel>

                      {/* Keywords Section */}
                      <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold flex items-center gap-2">
                            <Hash size={18} className="text-accent" />
                            Signal Keywords
                          </h3>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {draft.interests.categories[selectedCategory].keywords.length} Total
                          </span>
                        </div>
                        <div className="space-y-3">
                          {draft.interests.categories[selectedCategory].keywords.map((kw, idx) => (
                            <div key={idx} className="group flex items-center gap-2">
                              <input 
                                type="text"
                                value={kw}
                                onChange={(e) => {
                                  const newKws = [...draft.interests.categories[selectedCategory].keywords];
                                  newKws[idx] = e.target.value;
                                  handleUpdateCategory(selectedCategory, 'keywords', newKws);
                                }}
                                className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                              />
                              <button 
                                onClick={() => {
                                  const newKws = [...draft.interests.categories[selectedCategory].keywords].filter((_, i) => i !== idx);
                                  handleUpdateCategory(selectedCategory, 'keywords', newKws);
                                }}
                                className="p-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-alert transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newKws = [...draft.interests.categories[selectedCategory].keywords, ''];
                              handleUpdateCategory(selectedCategory, 'keywords', newKws);
                            }}
                            className="w-full py-2 border border-dashed border-white/10 rounded-lg text-slate-500 hover:text-accent hover:border-accent/50 text-xs font-medium transition-all"
                          >
                            + Add Keyword
                          </button>
                        </div>
                      </GlassPanel>
                    </div>

                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">AI Reasoning Overlay</h4>
                      <p className="text-sm text-slate-400 italic">
                        "{draft.interests.categories[selectedCategory].reason || 'No specific reasoning provided for this category.'}"
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                    Select a category to begin editing.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <KnowledgeGraph 
                settings={draft} 
                onKeywordToggle={handleKeywordToggle}
                onBrandToggle={handleBrandToggle}
              />
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SkillRegistry 
                skills={draft.interests.skills} 
                onToggleSkill={handleToggleSkill} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  'data-testid'?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, 'data-testid': testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex items-center gap-2 py-4 border-b-2 transition-all font-semibold text-sm ${
      active 
        ? 'border-primary text-white' 
        : 'border-transparent text-slate-500 hover:text-slate-300'
    }`}
  >
    {icon}
    {label}
  </button>
);
