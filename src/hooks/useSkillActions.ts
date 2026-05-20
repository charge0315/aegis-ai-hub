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
