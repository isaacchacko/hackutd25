'use client';

import { useState } from 'react';
import { Loader2, Dna, Sparkles } from 'lucide-react';
import { analyzeProtein } from '@/lib/api';
import { ProteinAnalysisResult } from '@/types';
import AgentProgress from '@/components/AgentProgress';
import ResultsPanel from '@/components/ResultsPanel';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<ProteinAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStep, setAgentStep] = useState<number>(0);

  const exampleQueries = [
    'Analyze human p53',
    'Find drug targets in SARS-CoV-2 spike',
    'Effects of R273H mutation on p53',
    'Analyze hemoglobin',
  ];

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    setAgentStep(0);
    
    try {
      // Simulate agent progress
      const progressInterval = setInterval(() => {
        setAgentStep(prev => Math.min(prev + 1, 4));
      }, 1500);
      
      const data = await analyzeProtein(query);
      
      clearInterval(progressInterval);
      setAgentStep(4);
      setResults(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Dna className="w-12 h-12 text-blue-400" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              FoldPilot AI
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            AI-powered protein analysis in seconds
          </p>
        </div>

        {/* Query Input */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about a protein... (e.g., 'Analyze human p53' or 'Find drug targets in SARS-CoV-2 spike')"
            className="w-full bg-transparent border-none text-white text-lg placeholder-gray-400 focus:outline-none resize-none"
            rows={3}
          />
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">Press Ctrl+Enter to analyze</p>
            
            <button
              onClick={handleAnalyze}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Protein
                </>
              )}
            </button>
          </div>
        </div>

        {/* Example Queries */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-3">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map(example => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors border border-white/10"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Progress */}
        {loading && <AgentProgress step={agentStep} />}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {results && <ResultsPanel results={results} />}
      </div>
    </main>
  );
}