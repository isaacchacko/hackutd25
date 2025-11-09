// src/components/ResultsPanel.tsx
import { ProteinAnalysisResult } from '@/types';
import { ExternalLink, Download, ArrowLeft, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BindingSitesPanel from './BindingSitesPanel';

interface ResultsPanelProps {
  results: ProteinAnalysisResult;
  query?: string;
  onAskAnother?: () => void;
}

export default function ResultsPanel({ results, query, onAskAnother }: ResultsPanelProps) {
  const handleDownload = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${results.protein}_analysis.json`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {results.warnings && results.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-slide-in-up">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 mb-1">Notice</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {results.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 animate-slide-in-up">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex-1">
            <h2 className="text-4xl font-semibold text-black leading-tight" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
              Analysis Results{query && (
                <>: <span className="italic">{query}</span></>
              )}
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {onAskAnother && (
              <button
                onClick={onAskAnother}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 text-black text-sm font-medium whitespace-nowrap"
                style={{ fontFamily: 'var(--font-stack-sans)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Ask Another Question
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 text-black font-medium text-sm whitespace-nowrap"
              style={{ fontFamily: 'var(--font-stack-sans)' }}
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Protein" value={results.protein} />
          <StatCard label="UniProt ID" value={results.uniprot_id} />
          <StatCard
            label="Papers Found (Max. 20)"
            value={results.literature?.total_papers?.toString() || '0'}
          />
          {results.structure_quality ? (
            <StatCard
              label="Avg pLDDT Score"
              value={results.structure_quality.avg_plddt.toFixed(1)}
              valueClassName="text-green-600"
            />
          ) : (
            <StatCard label="Structure Quality" value="N/A" />
          )}
        </div>

        {/* 🎯 BINDING SITES SECTION - Add this right after stats */}
        {results.binding_sites && (
          <div className="mb-6">
            <BindingSitesPanel bindingSites={results.binding_sites} />
          </div>
        )}

        {/* Synthesis */}
        {results.synthesis && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 animate-slide-in-up-delay-2">
            <div className="markdown-content text-black [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_strong]:font-semibold [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4 [&_a]:text-blue-600 [&_a]:hover:text-blue-800 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4">
              <ReactMarkdown>{results.synthesis}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Mutation Analysis */}
        {results.mutation_analysis && (
          <div className="bg-white rounded-lg p-6 mt-6 border border-gray-200 animate-slide-in-up-delay-2">
            <h3 className="font-semibold mb-3 text-lg text-black">Mutation Analysis</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Mutation: </span>
                <span className="font-mono font-semibold text-black">{results.mutation_analysis.mutation}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Prediction: </span>
                <span className={`font-semibold ${results.mutation_analysis.prediction === 'DESTABILIZING' ? 'text-red-600' :
                  results.mutation_analysis.prediction === 'STABILIZING' ? 'text-green-600' :
                    'text-yellow-600'
                  }`}>
                  {results.mutation_analysis.prediction}
                </span>
              </div>
              <p className="text-black mt-3">{results.mutation_analysis.reasoning}</p>
            </div>
          </div>
        )}

        {/* Literature */}
        {results.literature && results.literature.top_papers && (
          <div className="bg-white rounded-lg p-6 mt-6 border border-gray-200 animate-slide-in-up-delay-3">
            <h3 className="font-semibold mb-3 text-lg text-black">Key Research Papers</h3>
            <div className="space-y-3">
              {results.literature.top_papers.slice(0, 5).map((paper) => (
                <div key={paper.pmid} className="border-l-2 border-black pl-4">
                  
                    href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                  <a>
                    {paper.title}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-sm text-gray-600 mt-1">
                    PMID: {paper.pmid} &bull; {paper.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Data (Collapsible) */}
        <details className="bg-gray-100 rounded-lg p-4 mt-6 border border-gray-200">
          <summary className="cursor-pointer font-semibold mb-2 text-black">
            View Raw Data
          </summary>
          <pre className="text-sm text-black overflow-auto bg-white p-4 rounded border border-gray-200">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function StatCard({ label, value, valueClassName = 'text-black' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-xl font-semibold truncate ${valueClassName}`}>{value || 'N/A'}</p>
    </div>
  );
}