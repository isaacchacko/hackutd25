'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Dna, Sparkles } from 'lucide-react';
import { analyzeProteinStreaming, ProgressUpdate } from '@/lib/api';
import { ProteinAnalysisResult } from '@/types';
import AgentProgress from '@/components/AgentProgress';
import ResultsPanel from '@/components/ResultsPanel';
import QueryMarquee from '@/components/QueryMarquee';
import { exampleQueries } from '@/lib/exampleQueries';

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [results, setResults] = useState<ProteinAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time progress state
  const [currentStep, setCurrentStep] = useState<string>('planning');
  const [stepMessage, setStepMessage] = useState<string>('');
  const [currentTools, setCurrentTools] = useState<string[]>([]);
  const [currentApi, setCurrentApi] = useState<string>('');
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);

  // Handle query parameter from landing page
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const handleAnalyze = async () => {
    if (!query.trim()) return;

    setSubmittedQuery(query);
    setLoading(true);
    setError(null);
    setResults(null);
    setCurrentStep('planning');
    setStepMessage('');
    setCurrentTools([]);
    setCurrentApi('');
    setWorkflowSteps([]);

    try {
      // Use streaming API with real-time progress callbacks
      const data = await analyzeProteinStreaming(
        query,
        (update: ProgressUpdate) => {
          console.log('📊 Progress update:', update);
          
          // Handle workflow metadata
          if (update.step === 'workflow' && update.data) {
            setWorkflowSteps(update.data.steps || []);
            return;
          }
          
          setCurrentStep(update.step);
          setStepMessage(update.message);
          setCurrentTools(update.tools || []);
          setCurrentApi(update.api || '');
        }
      );

      console.log('✅ Final result:', data);
      console.log('🎯 Binding sites:', data.binding_sites);

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
    setCurrentStep('planning');
    setStepMessage('');
    setCurrentTools([]);
    setCurrentApi('');
    setWorkflowSteps([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <Dna className="w-16 h-16 text-black" />
              <div>
                <Link href="/">
                  <h1 className="text-6xl font-bold text-black hover:opacity-80 transition-opacity cursor-pointer mb-1" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                    FoldForge AI
                  </h1>
                </Link>
                <p className="text-xl text-black/70" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                  AI-powered protein analysis with real-time drug binding detection
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Query Input */}
        {!submittedQuery && (
          <div className="bg-gray-50 rounded-2xl px-6 mb-8 animate-fade-in-up flex flex-row justify-between gap-3">
            <div className='border border-gray-200 flex-1 rounded-lg'>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about a protein... (e.g., 'Analyze human p53' or 'Find drug targets in SARS-CoV-2 spike')"
                className="w-full p-3 bg-transparent border-none text-black text-lg placeholder-gray-500 focus:outline-none resize-none overflow-hidden"
              />


            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !query.trim()}
              className="px-6 py-3 whitespace-nowrap bg-black text-white hover:bg-gray-800 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        )}

        {/* Example Queries Marquee - Only show when no query submitted */}
        {!submittedQuery && (
          <div className="mb-8 animate-fade-in-up-delay">
            <p className="text-sm text-gray-600 mb-3">Or, try these examples:</p>
            <QueryMarquee queries={exampleQueries} />
          </div>
        )}

        {/* Real-time Agent Progress */}
        {loading && (
          <AgentProgress
            currentStep={currentStep}
            stepMessage={stepMessage}
            tools={currentTools}
            api={currentApi}
            workflowSteps={workflowSteps}
          />
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-8">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="animate-fade-in">
            <ResultsPanel
              results={results}
              query={submittedQuery}
              onAskAnother={handleAskAnother}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
          </div>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
