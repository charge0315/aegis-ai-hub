/**
 * Agent Monitor Component
 * Visualizes SSE events from the Orchestrator
 */
export class AgentMonitor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  addEvent(event) {
    const { status, message, step, agent, timestamp = new Date().toLocaleTimeString() } = event;
    
    const eventEl = document.createElement('div');
    eventEl.className = 'flex gap-4 items-start animate-slide-up';
    
    const icon = this.getIconForAgent(agent || 'system');
    const colorClass = this.getColorForAgent(agent || 'system');

    eventEl.innerHTML = `
      <div class="p-2 rounded-lg ${colorClass.bg} ${colorClass.text} mt-1">
        <i data-lucide="${icon}" class="w-4 h-4"></i>
      </div>
      <div class="flex-1">
        <div class="flex justify-between text-xs mb-1">
          <span class="font-semibold ${colorClass.text}">${agent ? agent.toUpperCase() : 'SYSTEM'}</span>
          <span class="text-slate-500">${timestamp}</span>
        </div>
        <p class="text-sm text-slate-300">${message}</p>
        ${step ? `<div class="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-nexus-blue animate-shimmer" style="width: ${this.getStepProgress(step)}%"></div>
        </div>` : ''}
      </div>
    `;

    this.container.prepend(eventEl);
    if (this.container.children.length > 50) {
      this.container.lastElementChild.remove();
    }

    // Refresh lucide icons for the new element
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: { class: 'lucide' },
        nameAttr: 'data-lucide'
      });
    }
  }

  getIconForAgent(agent) {
    switch (agent.toLowerCase()) {
      case 'architect': return 'layout-template';
      case 'generator': return 'code-2';
      case 'evaluator': return 'microscope';
      case 'e2e-runner': return 'play-circle';
      default: return 'info';
    }
  }

  getColorForAgent(agent) {
    switch (agent.toLowerCase()) {
      case 'architect': return { bg: 'bg-nexus-blue/20', text: 'text-nexus-blue' };
      case 'generator': return { bg: 'bg-nexus-cyan/20', text: 'text-nexus-cyan' };
      case 'evaluator': return { bg: 'bg-nexus-violet/20', text: 'text-nexus-violet' };
      case 'e2e-runner': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400' };
      default: return { bg: 'bg-slate-500/20', text: 'text-slate-400' };
    }
  }

  getStepProgress(step) {
    // Basic mapping for visual variety
    const steps = {
      'planning': 25,
      'implementing': 50,
      'testing': 75,
      'completed': 100
    };
    return steps[step.toLowerCase()] || 10;
  }
}
