import { useCallback } from 'react';
import { useTranslation } from './useTranslationHook';
import type { NexusSettings, Skill } from '../types';
import type { DialogType } from '../components/CustomDialog';

interface UseSkillActionsProps {
  setDraft: React.Dispatch<React.SetStateAction<NexusSettings>>;
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
  customPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  DEFAULT_SKILLS: Skill[];
}

/**
 * エージェントのスキル（機能）の管理（追加、有効化の切り替え）を担当するカスタムフック。
 * 
 * 【設計思想】
 * - アプリケーションの拡張性を司る「スキル」の状態管理を独立させ、エディタ上での操作を簡素化します。
 * - 各スキルがどのアージェントに所属し、どのような種類（tool, action, logic）であるかを定義する
 *   メタデータ操作をカプセル化します。
 * 
 * 【実装の意図】
 * - `handleToggleSkill` では、既存のスキル配列をマッピングして特定のIDの有効状態を反転させることで、
 *   イミュータブルな状態更新を確実に行っています。
 * - `handleAddSkill` では、名前からIDを自動生成し、IDの重複チェックを行うことで、
 *   データ整合性を維持しながら新しい機能を定義できるようにしています。
 */
export function useSkillActions({
  setDraft,
  customAlert,
  customPrompt,
  DEFAULT_SKILLS
}: UseSkillActionsProps) {
  const { t } = useTranslation();

  const handleToggleSkill = useCallback((skillId: string) => {
    setDraft(prev => {
      const currentSkills = prev.interests.skills || DEFAULT_SKILLS;
      const newSkills = currentSkills.map(s =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, interests: { ...prev.interests, skills: newSkills } };
    });
  }, [DEFAULT_SKILLS, setDraft]);

  const handleAddSkill = useCallback(async () => {
    const name = await customPrompt(t.handlers.newSkill, t.handlers.newSkillPrompt, '', t.handlers.newSkillPlaceholder);
    if (!name) return;
    const description = await customPrompt(t.dialog.description, t.handlers.skillDesc.replace('{name}', name), '', t.handlers.skillDescPlaceholder);
    if (!description) return;
    const agent = await customPrompt(t.dialog.targetAgent, t.handlers.skillAgent, 'Architect', t.handlers.skillAgentPlaceholder);
    if (!agent) return;
    const typePrompt = await customPrompt(t.dialog.skillType, t.handlers.skillType, 'tool');
    const type = (typePrompt === 'tool' || typePrompt === 'action' || typePrompt === 'logic') ? typePrompt : 'tool';
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    setDraft(prev => {
      const currentSkills = prev.interests.skills || DEFAULT_SKILLS;
      if (currentSkills.find(s => s.id === id)) {
        void customAlert(t.dialog.idConflict, t.handlers.skillConflict, 'warning');
        return prev;
      }
      const newSkill: Skill = { id, name, description, agent, type, enabled: true };
      return { ...prev, interests: { ...prev.interests, skills: [...currentSkills, newSkill] } };
    });
  }, [customAlert, customPrompt, t, DEFAULT_SKILLS, setDraft]);

  return {
    handleToggleSkill,
    handleAddSkill
  };
}
