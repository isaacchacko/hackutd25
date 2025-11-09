// src/components/ResultsPanel.tsx
import { ProteinAnalysisResult } from '@/types';
import { ExternalLink, Download } from 'lucide-react';

interface ResultsPanelProps {
  results: ProteinAnalysisResult;
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
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
      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 animate-slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-black">Analysis Results</h2>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 text-black"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Protein" value={results.protein} />
          <StatCard label="UniProt ID" value={results.uniprot_id} />
          <StatCard 
            label="Papers Found" 
            value={results.literature?.total_papers?.toString() || '0'} 
          />
        </div>

        {/* Structure Quality */}
        {results.structure_quality && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200 animate-slide-in-up-delay-1">
            <h3 className="font-semibold mb-2 text-black">Structure Quality</h3>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-gray-600">Avg pLDDT Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {results.structure_quality.avg_plddt.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-lg font-semibold text-black">
                  {results.structure_quality.confidence}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Synthesis */}
        {results.synthesis && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 animate-slide-in-up-delay-2">
            <h3 className="font-semibold mb-3 text-lg text-black">AI Analysis</h3>
            <div className="prose max-w-none">
              <p className="text-black whitespace-pre-wrap">{results.synthesis}</p>
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
                <span className={`font-semibold ${
                  results.mutation_analysis.prediction === 'DESTABILIZING' ? 'text-red-600' :
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
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                  >
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
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-semibold truncate text-black">{value || 'N/A'}</p>
    </div>
  );
}