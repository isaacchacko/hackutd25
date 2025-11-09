'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Dna, Sparkles, ArrowLeft } from 'lucide-react';
import { analyzeProtein } from '@/lib/api';
import { ProteinAnalysisResult } from '@/types';
import AgentProgress from '@/components/AgentProgress';
import ResultsPanel from '@/components/ResultsPanel';
import QueryMarquee from '@/components/QueryMarquee';
import { exampleQueries } from '@/lib/exampleQueries';
import ProteinViewer from '@/components/ProteinViewer';

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [results, setResults] = useState<ProteinAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStep, setAgentStep] = useState<number>(0);

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
    setAgentStep(0);

    try {
      // Simulate agent progress
      const progressInterval = setInterval(() => {
        setAgentStep(prev => Math.min(prev + 1, 4));
      }, 1500);

      // ✅ Binding sites are always enabled (no parameter needed - handled in api.ts)
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

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className='flex flex-col items-center'>
              <div className="flex items-center gap-3">
                <Dna className="w-12 h-12 text-black" />
                <Link href="/">
                  <h1 className="text-6xl font-bold text-black hover:opacity-80 transition-opacity cursor-pointer" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                    FoldPilot AI
                  </h1>
                </Link>
              </div>

              <p className="text-xl text-black/70" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                AI-powered protein analysis with drug binding site detection
              </p>
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
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">Press Ctrl+Enter to analyze</p>
                {/* ✅ Info badge showing binding sites are included */}
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  🎯 Includes drug binding site analysis
                </span>
              </div>

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
        )}

        {/* Example Queries Marquee - Only show when no query submitted */}
        {!submittedQuery && (
          <div className="mb-8 animate-fade-in-up-delay">
            <p className="text-sm text-gray-600 mb-3">Or, try these examples:</p>
            <QueryMarquee queries={exampleQueries} />
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
  <>
    <ResultsPanel
      results={results}
      query={submittedQuery}
      onAskAnother={handleAskAnother}
    />
    
    {/* Only show viewer if we have a valid UniProt ID */}
    {results.uniprot_id && results.uniprot_id !== "N/A" && (
      <div className="mt-8">
        <ProteinViewer uniprotId={results.uniprot_id} />
      </div>
    )}
  </>
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