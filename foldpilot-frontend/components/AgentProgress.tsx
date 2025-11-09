// src/components/AgentProgress.tsx
import { Brain, Dna, BookOpen, FileText, Target, LucideIcon } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

interface AgentProgressProps {
  step?: number; // Legacy support for timer-based
  currentStep?: string; // Real-time step from backend
  stepMessage?: string; // Optional message from backend
}

export default function AgentProgress({ step, currentStep, stepMessage }: AgentProgressProps) {
  const agents: Agent[] = [
    { id: 'planning', name: 'Planning', icon: Brain, description: 'Understanding query' },
    { id: 'structure', name: 'Structure', icon: Dna, description: 'Fetching protein structure' },
    { id: 'binding', name: 'Binding Sites', icon: Target, description: 'Finding drug targets' },
    { id: 'literature', name: 'Literature', icon: BookOpen, description: 'Searching research papers' },
    { id: 'synthesis', name: 'Synthesis', icon: FileText, description: 'Generating insights' },
  ];

  // Convert step name to index for real-time mode
  const getCurrentIndex = () => {
    if (currentStep) {
      const mapping: Record<string, number> = {
        'planning': 0,
        'structure': 1,
        'binding': 2,
        'literature': 3,
        'synthesis': 4
      };
      return mapping[currentStep] ?? 0;
    }
    return step ?? 0;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-black">AI Agents Working...</h3>
        {stepMessage && (
          <p className="text-sm text-gray-600 italic">{stepMessage}</p>
        )}
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {agents.map((agent, index) => {
          const Icon = agent.icon;
          const isActive = currentIndex === index;
          const isComplete = currentIndex > index;
          
          return (
            <div
              key={agent.name}
              className={`
                p-4 rounded-lg border-2 transition-all duration-300
                ${isActive ? 'border-black bg-gray-100 scale-105' : ''}
                ${isComplete ? 'border-green-600 bg-green-50' : ''}
                ${!isActive && !isComplete ? 'border-gray-300 bg-white opacity-50' : ''}
              `}
            >
              <Icon className={`
                w-8 h-8 mb-2 transition-all duration-300
                ${isActive ? 'animate-pulse text-black' : ''}
                ${isComplete ? 'text-green-600' : 'text-gray-400'}
              `} />
              <p className="font-semibold text-black text-sm">{agent.name}</p>
              <p className="text-xs text-gray-600 mt-1">{agent.description}</p>
              
              {isComplete && (
                <div className="mt-2 text-green-600 text-sm font-medium">✓ Complete</div>
              )}
              {isActive && (
                <div className="mt-2 text-black text-sm font-medium">● Working...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}