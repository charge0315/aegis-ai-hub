import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Plus, 
  Globe, 
  Hash, 
  Trash2,
  GripVertical,
  X,
  Sparkles,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { GlassPanel } from '../GlassPanel';
import type { Interests } from '../../models/Schemas';

interface CategoryEditorProps {
  draft: { interests: Interests };
  selectedCategory: string | null;
  setSelectedCategory: (name: string | null) => void;
  isSuggesting: boolean;
  isSuggestingBrands: boolean;
  isSuggestingKeywords: boolean;
  handleAddCategory: () => Promise<void>;
  handleRenameCategory: (oldName: string) => Promise<void>;
  handleDeleteCategory: (name: string) => Promise<void>;
  handleEditEmoji: (name: string) => Promise<void>;
  handleReorderCategories: (newOrder: string[]) => void;
  handleAISuggest: (field: 'brands' | 'keywords') => Promise<void>;
  handleUpdateCategory: (name: string, field: 'brands' | 'keywords', values: string[]) => void;
  customPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  draft,
  selectedCategory,
  setSelectedCategory,
  isSuggesting,
  isSuggestingBrands,
  isSuggestingKeywords,
  handleAddCategory,
  handleRenameCategory,
  handleDeleteCategory,
  handleEditEmoji,
  handleReorderCategories,
  handleAISuggest,
  handleUpdateCategory,
  customPrompt
}) => {
  const categoryKeys = Object.keys(draft.interests.categories);

  return (
    <motion.div
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
        
        <Reorder.Group 
          axis="y" 
          values={categoryKeys} 
          onReorder={handleReorderCategories}
          className="space-y-2"
        >
          {categoryKeys.map((catName) => (
            <Reorder.Item 
              key={catName} 
              value={catName}
              className="group relative flex items-center gap-1"
            >
              <div className="p-1 text-slate-700 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={16} />
              </div>
              
              <button
                onClick={() => setSelectedCategory(catName)}
                className={`flex-grow flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedCategory === catName 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' 
                    : 'text-slate-400 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span 
                  className="text-xl hover:scale-125 transition-transform cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEmoji(catName);
                  }}
                  title="Change Emoji"
                >
                  {draft.interests.categories[catName].emoji}
                </span>
                <span className="font-semibold truncate text-left">{catName}</span>
              </button>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleRenameCategory(catName)}
                  className="p-2 text-slate-600 hover:text-primary transition-colors"
                  title="Rename Category"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteCategory(catName)}
                  className="p-2 text-slate-600 hover:text-alert transition-colors"
                  title="Delete Category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <button 
          onClick={handleAddCategory}
          disabled={isSuggesting}
          className="w-full flex items-center gap-3 p-3 text-slate-500 hover:text-accent hover:bg-accent/5 rounded-xl border border-dashed border-white/10 transition-all mt-4 disabled:opacity-50"
        >
          <Plus size={18} />
          <span className="text-sm font-medium">{isSuggesting ? 'Generating...' : 'Add New Category'}</span>
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAISuggest('brands')}
                      disabled={isSuggestingBrands}
                      className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                      title="AI Suggest Brands"
                    >
                      {isSuggestingBrands ? (
                        <RotateCcw size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      AI Suggest
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {draft.interests.categories[selectedCategory].brands.length} Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.interests.categories[selectedCategory].brands.map((brand, idx) => (
                    <div 
                      key={idx} 
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary-foreground animate-in fade-in zoom-in duration-200"
                    >
                      <span 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newVal = e.currentTarget.textContent || '';
                          const newBrands = [...draft.interests.categories[selectedCategory].brands];
                          newBrands[idx] = newVal;
                          handleUpdateCategory(selectedCategory, 'brands', newBrands.filter(b => b));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="outline-none focus:text-white"
                      >
                        {brand}
                      </span>
                      <button 
                        onClick={() => {
                          const newBrands = draft.interests.categories[selectedCategory].brands.filter((_, i) => i !== idx);
                          handleUpdateCategory(selectedCategory, 'brands', newBrands);
                        }}
                        className="hover:text-alert transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={async () => {
                      const val = await customPrompt('Add Brand', 'Enter new brand name:');
                      if (val) {
                        const newBrands = [...draft.interests.categories[selectedCategory].brands, val];
                        handleUpdateCategory(selectedCategory, 'brands', newBrands);
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-white/20 text-slate-500 hover:text-primary hover:border-primary/50 transition-all"
                    title="Add Brand"
                  >
                    <Plus size={16} />
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAISuggest('keywords')}
                      disabled={isSuggestingKeywords}
                      className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-md text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                      title="AI Suggest Keywords"
                    >
                      {isSuggestingKeywords ? (
                        <RotateCcw size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      AI Suggest
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {draft.interests.categories[selectedCategory].keywords.length} Total
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.interests.categories[selectedCategory].keywords.map((kw, idx) => (
                    <div 
                      key={idx} 
                      className="group flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm text-accent-foreground animate-in fade-in zoom-in duration-200"
                    >
                      <span 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newVal = e.currentTarget.textContent || '';
                          const newKws = [...draft.interests.categories[selectedCategory].keywords];
                          newKws[idx] = newVal;
                          handleUpdateCategory(selectedCategory, 'keywords', newKws.filter(k => k));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="outline-none focus:text-white"
                      >
                        {kw}
                      </span>
                      <button 
                        onClick={() => {
                          const newKws = [...draft.interests.categories[selectedCategory].keywords].filter((_, i) => i !== idx);
                          handleUpdateCategory(selectedCategory, 'keywords', newKws);
                        }}
                        className="hover:text-alert transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={async () => {
                      const val = await customPrompt('Add Keyword', 'Enter new keyword:');
                      if (val) {
                        const newKws = [...draft.interests.categories[selectedCategory].keywords, val];
                        handleUpdateCategory(selectedCategory, 'keywords', newKws);
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-white/20 text-slate-500 hover:text-accent hover:border-accent/50 transition-all"
                    title="Add Keyword"
                  >
                    <Plus size={16} />
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
  );
};
