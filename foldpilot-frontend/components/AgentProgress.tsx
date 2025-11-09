import { Brain, Dna, BookOpen, FileText, LucideIcon } from 'lucide-react';

interface Agent {
  name: string;
  icon: LucideIcon;
  description: string;
}

interface AgentProgressProps {
  step: number;
}

export default function AgentProgress({ step }: AgentProgressProps) {
  const agents: Agent[] = [
    { name: 'Planning', icon: Brain, description: 'Understanding query' },
    { name: 'Structure', icon: Dna, description: 'Fetching protein structure' },
    { name: 'Literature', icon: BookOpen, description: 'Searching research papers' },
    { name: 'Synthesis', icon: FileText, description: 'Generating insights' },
  ];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
      <h3 className="text-xl font-semibold mb-6">AI Agents Working...</h3>
      
      <div className="grid grid-cols-4 gap-4">
        {agents.map((agent, index) => {
          const Icon = agent.icon;
          const isActive = step === index;
          const isComplete = step > index;
          
          return (
            <div
              key={agent.name}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${isActive ? 'border-blue-500 bg-blue-500/20 scale-105' : ''}
                ${isComplete ? 'border-green-500 bg-green-500/10' : ''}
                ${!isActive && !isComplete ? 'border-white/10 bg-white/5 opacity-50' : ''}
              `}
            >
              <Icon className={`
                w-8 h-8 mb-2
                ${isActive ? 'animate-pulse text-blue-400' : ''}
                ${isComplete ? 'text-green-400' : ''}
              `} />
              <p className="font-semibold">{agent.name}</p>
              <p className="text-xs text-gray-400 mt-1">{agent.description}</p>
              
              {isComplete && (
                <div className="mt-2 text-green-400 text-sm">✓ Complete</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}