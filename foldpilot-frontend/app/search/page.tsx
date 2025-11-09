
'use client';

import { useState } from 'react';
import { Loader2, Dna, Sparkles, ArrowLeft } from 'lucide-react';
import { analyzeProtein } from '@/lib/api';
import { ProteinAnalysisResult } from '@/types';
import AgentProgress from '@/components/AgentProgress';
import ResultsPanel from '@/components/ResultsPanel';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
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

    setSubmittedQuery(query);
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

  const handleAskAnother = () => {
    setQuery('');
    setSubmittedQuery('');
    setResults(null);
    setError(null);
    setAgentStep(0);
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
    <main className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Dna className="w-12 h-12 text-black" />
            <h1 className="text-6xl font-bold text-black" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
              FoldPilot AI
            </h1>
          </div>
          <p className="text-xl text-black/70" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
            AI-powered protein analysis in seconds
          </p>
        </div>

        {/* Query Input or Submitted Question */}
        {!submittedQuery ? (
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-200 animate-fade-in-up">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about a protein... (e.g., 'Analyze human p53' or 'Find drug targets in SARS-CoV-2 spike')"
              className="w-full bg-transparent border-none text-black text-lg placeholder-gray-500 focus:outline-none resize-none"
              rows={3}
            />

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">Press Ctrl+Enter to analyze</p>

              <button
                onClick={handleAnalyze}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        ) : (
          <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-200 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">Your Question</p>
                <h2 className="text-3xl font-semibold text-black leading-tight" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                  {submittedQuery}
                </h2>
              </div>
              <button
                onClick={handleAskAnother}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 text-black text-sm font-medium whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                Ask Another Question
              </button>
            </div>
          </div>
        )}

        {/* Example Queries - Only show when no query submitted */}
        {!submittedQuery && (
          <div className="mb-8 animate-fade-in-up-delay">
            <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map(example => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors border border-gray-300 text-black"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agent Progress */}
        {loading && <AgentProgress step={agentStep} />}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-8">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="animate-fade-in">
            <ResultsPanel results={results} />
          </div>
        )}
      </div>
    </main>
  );
}
