import re
with open('src/hooks/useUnifiedEditorHandlers.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
code = code.replace(
    "import type { DialogType } from '../components/CustomDialog';",
    "import type { DialogType } from '../components/CustomDialog';\nimport { useTranslation } from './useTranslationHook';"
)

# Add useTranslation
code = code.replace(
    '  const [draft, setDraft] = useState<NexusSettings>(currentSettings);',
    '  const { t, language } = useTranslation();\n  const [draft, setDraft] = useState<NexusSettings>(currentSettings);'
)

# Replace strings
code = code.replace("'Trend discovery requires a Gemini API Key. Would you like to go to System Settings to configure it?'", 't.handlers.apiKeyRequired')
code = code.replace("'AI analyzed current feeds but did not find any new significant signals at this time.'", 't.handlers.noTrends')
code = code.replace("'Enter a name for the new intelligence category:'", 't.handlers.newCategoryPrompt')
code = code.replace("'New Category', t.handlers.newCategoryPrompt", "t.handlers.newCategory, t.handlers.newCategoryPrompt")
code = code.replace("'This category already exists in your configuration.'", 't.handlers.categoryExists')
code = code.replace("'Gemini API Key is not set. AI-powered category generation will be skipped. Would you like to go to System Settings to configure it?'", 't.handlers.apiKeyRequired')
code = code.replace("`Gemini has suggested 5 brands and 5 keywords for \"${name}\".`", "t.handlers.suggestionsReady.replace('{name}', name)")
code = code.replace("'Configuration saved successfully!'", 't.handlers.saveSuccess')
code = code.replace("'The configuration on the server is newer. Would you like to discard your changes and reload the latest version?'", 't.handlers.syncConflict')
code = code.replace("`Failed to save configuration: ${message}`", "t.handlers.saveFailed.replace('{message}', message)")
code = code.replace("'Gemini API Key saved and applied.'", 't.handlers.apiKeySuccess')
code = code.replace("'Failed to save API key.'", 't.handlers.apiKeyFailed')
code = code.replace("'New Skill Name', 'Enter a name for the new agent capability:'", "t.handlers.newSkill, t.handlers.newSkillPrompt")
code = code.replace("`Enter a description for \"${name}\":`", "t.handlers.skillDesc.replace('{name}', name)")
code = code.replace("'Which agent should possess this skill?'", "t.handlers.skillAgent")
code = code.replace("'Enter skill type (tool, action, or logic):'", "t.handlers.skillType")
code = code.replace("'A skill with a similar name already exists.'", "t.handlers.skillConflict")
code = code.replace("`Successfully added \"${name}\" to the ${agent} cluster.`", "t.handlers.skillSuccess.replace('{name}', name).replace('{agent}', agent)")
code = code.replace("`Enter a new name for \"${oldName}\":`", "t.handlers.renamePrompt.replace('{oldName}', oldName)")
code = code.replace("'A category with this name already exists.'", "t.handlers.nameConflict")
code = code.replace("`Enter a new emoji for \"${catName}\":`", "t.handlers.emojiPrompt.replace('{catName}', catName)")
code = code.replace("`Are you sure you want to permanently delete the category \"${catName}\"? All associated brands and keywords will be removed.`", "t.handlers.deleteConfirm.replace('{catName}', catName)")
code = code.replace("'Gemini API Key is not set. Would you like to go to System Settings to configure it now?'", 't.handlers.apiKeyRequired')
code = code.replace("`Gemini suggested ${newItems.length} new ${field} for \"${selectedCategory}\".`", "t.handlers.aiSuggestSuccess.replace('{count}', String(newItems.length)).replace('{field}', field).replace('{category}', selectedCategory)")
code = code.replace("`Could not get suggestions from Gemini: ${errorMsg}`", "t.handlers.aiSuggestFailed.replace('{message}', errorMsg)")
code = code.replace("'Please set your Gemini API key in System Settings first.'", 't.handlers.apiKeyRequiredSimple')
code = code.replace("'How many categories would you like to reorganize everything into?'", 't.handlers.restructurePrompt')
code = code.replace("'Please enter a valid number between 5 and 15.'", 't.handlers.restructureInvalid')
code = code.replace("`This will completely transform your intelligence profile. AI will reorganize everything into ${targetCount} optimal categories, redistribute your existing feeds, and discover new high-quality sources for each group. Proceed?`", "t.handlers.restructureConfirm.replace('{count}', String(targetCount))")
code = code.replace("`Phase 1/2: Reorganizing into ${targetCount} Categories...`", "t.handlers.restructurePhase1.replace('{count}', String(targetCount))")
code = code.replace("'Phase 2/2: Injecting New High-Quality Sources...'", "t.handlers.restructurePhase2")
code = code.replace("'Final Phase: Synchronizing with Backend...'", "t.handlers.restructurePhaseFinal")
code = code.replace("'AI has successfully transformed your intelligence profile. Sync complete.'", "t.handlers.restructureSuccess")
code = code.replace("`An error occurred: ${errorMsg}`", "t.handlers.restructureFailed.replace('{message}', errorMsg)")
code = code.replace("'This will erase all custom categories and restore factory state. Proceed?'", "t.handlers.resetConfirm")
code = code.replace("'Profile restored to defaults. Reloading...'", "t.handlers.resetSuccess")
code = code.replace("'Failed to restore default settings.'", "t.handlers.resetFailed")

# Add language arguments to backend calls
code = code.replace("nexusApi.restructureCategories(targetCount)", "nexusApi.restructureCategories(targetCount, language)")

with open('src/hooks/useUnifiedEditorHandlers.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print('Replaced')
