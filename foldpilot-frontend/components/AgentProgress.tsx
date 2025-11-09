// src/components/AgentProgress.tsx
import { Brain, Dna, BookOpen, FileText, Target, LucideIcon, Code, Database, Zap, ArrowRight } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  defaultTools?: string[];
  defaultApi?: string;
}

interface AgentProgressProps {
  step?: number; // Legacy support for timer-based
  currentStep?: string; // Real-time step from backend
  stepMessage?: string; // Optional message from backend
  tools?: string[]; // Current tools being used
  api?: string; // Current API being used
  workflowSteps?: string[]; // Dynamic workflow steps from backend
}

export default function AgentProgress({ step, currentStep, stepMessage, tools, api, workflowSteps }: AgentProgressProps) {
  // All possible agents
  const allAgents: Record<string, Agent> = {
    planning: { 
      id: 'planning', 
      name: 'Planning', 
      icon: Brain, 
      description: 'Understanding query',
      defaultTools: ['NVIDIA Nemotron LLM', 'Entity Extraction'],
      defaultApi: 'Nemotron API'
    },
    structure: { 
      id: 'structure', 
      name: 'Structure', 
      icon: Dna, 
      description: 'Fetching protein structure',
      defaultTools: ['UniProt API', 'AlphaFold Database'],
      defaultApi: 'UniProt REST + AlphaFold EBI'
    },
    binding: { 
      id: 'binding', 
      name: 'Binding Sites', 
      icon: Target, 
      description: 'Finding drug targets',
      defaultTools: ['BioPython PDBParser', 'Geometric Algorithms'],
      defaultApi: 'Local Computation'
    },
    literature: { 
      id: 'literature', 
      name: 'Literature', 
      icon: BookOpen, 
      description: 'Searching research papers',
      defaultTools: ['NCBI Entrez', 'Europe PMC API'],
      defaultApi: 'PubMed API + Europe PMC REST'
    },
    synthesis: { 
      id: 'synthesis', 
      name: 'Synthesis', 
      icon: FileText, 
      description: 'Generating insights',
      defaultTools: ['NVIDIA Nemotron LLM', 'QA Agent'],
      defaultApi: 'Nemotron API'
    },
  };
  
  // Build dynamic agent list based on workflow steps, or fallback to default
  const agents: Agent[] = workflowSteps && workflowSteps.length > 0
    ? workflowSteps.map(stepId => allAgents[stepId]).filter(Boolean)
    : Object.values(allAgents); // Default: show all agents

  // Convert step name to index for real-time mode (based on dynamic agent list)
  const getCurrentIndex = () => {
    if (currentStep) {
      const index = agents.findIndex(agent => agent.id === currentStep);
      return index >= 0 ? index : 0;
    }
    return step ?? 0;
  };

  const currentIndex = getCurrentIndex();
  const currentAgent = agents[currentIndex];
  const displayTools = tools && tools.length > 0 ? tools : (currentAgent?.defaultTools || []);
  const displayApi = api || currentAgent?.defaultApi || '';

  // Tool icon mapping
  const getToolIcon = (tool: string) => {
    if (tool.includes('Nemotron') || tool.includes('LLM')) return Brain;
    if (tool.includes('API') || tool.includes('Database')) return Database;
    if (tool.includes('PDBParser') || tool.includes('BioPython')) return Code;
    if (tool.includes('Algorithm')) return Zap;
    return Code;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-8 border-2 border-gray-200 shadow-lg">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-black">Multi-Agent Orchestration</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-xs font-semibold">
            <Zap className="w-3 h-3" />
            Live Workflow
          </div>
        </div>
        {stepMessage && (
          <div className="bg-white rounded-lg p-3 border border-gray-300">
            <p className="text-sm text-gray-700 font-medium">{stepMessage}</p>
            {displayApi && (
              <div className="mt-2 flex items-center gap-2">
                <Database className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600 font-mono">{displayApi}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flow Diagram */}
      <div className="mb-8 relative">
        <div className="flex items-center justify-between">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            const isActive = currentIndex === index;
            const isComplete = currentIndex > index;
            const isPending = currentIndex < index;

            return (
              <div key={agent.id} className="flex items-center flex-1">
                {/* Agent Node */}
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      relative w-16 h-16 rounded-full border-4 transition-all duration-500 flex items-center justify-center
                      ${isActive ? 'border-black bg-white scale-110 shadow-lg animate-pulse' : ''}
                      ${isComplete ? 'border-green-600 bg-green-50 scale-100' : ''}
                      ${isPending ? 'border-gray-300 bg-gray-100 scale-90 opacity-40' : ''}
                    `}
                  >
                    <Icon className={`
                      w-7 h-7 transition-all duration-300
                      ${isActive ? 'text-black' : ''}
                      ${isComplete ? 'text-green-600' : 'text-gray-400'}
                    `} />
                    {isComplete && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center animate-ping">
                        <span className="text-white text-xs font-bold">●</span>
                      </div>
                    )}
                  </div>
                  <p className={`
                    mt-2 text-xs font-semibold text-center transition-all duration-300
                    ${isActive ? 'text-black' : ''}
                    ${isComplete ? 'text-green-600' : 'text-gray-500'}
                  `}>
                    {agent.name}
                  </p>
                </div>

                {/* Arrow Connector */}
                {index < agents.length - 1 && (
                  <div className="flex-1 mx-2 h-0.5 relative">
                    <div className={`
                      absolute top-0 left-0 h-full transition-all duration-500
                      ${isComplete ? 'bg-green-600 w-full' : 'bg-gray-300 w-0'}
                    `} />
                    <ArrowRight className={`
                      absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300
                      ${isComplete ? 'text-green-600' : 'text-gray-300'}
                    `} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Agent Details with Tools */}
      {currentAgent && (
        <div className="bg-white rounded-xl p-6 border-2 border-gray-300 shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center
              ${currentIndex === getCurrentIndex() ? 'bg-black' : 'bg-gray-200'}
            `}>
              {(() => {
                const Icon = currentAgent.icon;
                return <Icon className={`w-6 h-6 ${currentIndex === getCurrentIndex() ? 'text-white' : 'text-gray-600'}`} />;
              })()}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-black mb-1">{currentAgent.name} Agent</h4>
              <p className="text-sm text-gray-600">{currentAgent.description}</p>
            </div>
            <div className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${currentIndex === getCurrentIndex() ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {currentIndex === getCurrentIndex() ? 'Active' : 'Complete'}
            </div>
          </div>

          {/* Tools Section */}
          {displayTools.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tools & APIs</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayTools.map((tool, idx) => {
                  const ToolIcon = getToolIcon(tool);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                      <ToolIcon className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">{tool}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* API Section */}
          {displayApi && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mr-2">API:</span>
                <span className="text-xs font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{displayApi}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
