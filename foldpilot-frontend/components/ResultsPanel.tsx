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
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Analysis Results</h2>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
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
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Structure Quality</h3>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-gray-400">Avg pLDDT Score</p>
                <p className="text-2xl font-bold text-green-400">
                  {results.structure_quality.avg_plddt.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Confidence</p>
                <p className="text-lg font-semibold">
                  {results.structure_quality.confidence}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Synthesis */}
        {results.synthesis && (
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="font-semibold mb-3 text-lg">AI Analysis</h3>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 whitespace-pre-wrap">{results.synthesis}</p>
            </div>
          </div>
        )}

        {/* Mutation Analysis */}
        {results.mutation_analysis && (
          <div className="bg-white/5 rounded-lg p-6 mt-6">
            <h3 className="font-semibold mb-3 text-lg">Mutation Analysis</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-400">Mutation: </span>
                <span className="font-mono font-semibold">{results.mutation_analysis.mutation}</span>
              </div>
              <div>
                <span className="text-sm text-gray-400">Prediction: </span>
                <span className={`font-semibold ${
                  results.mutation_analysis.prediction === 'DESTABILIZING' ? 'text-red-400' :
                  results.mutation_analysis.prediction === 'STABILIZING' ? 'text-green-400' :
                  'text-yellow-400'
                }`}>
                  {results.mutation_analysis.prediction}
                </span>
              </div>
              <p className="text-gray-300 mt-3">{results.mutation_analysis.reasoning}</p>
            </div>
          </div>
        )}

        {/* Literature */}
        {results.literature && results.literature.top_papers && (
          <div className="bg-white/5 rounded-lg p-6 mt-6">
            <h3 className="font-semibold mb-3 text-lg">Key Research Papers</h3>
            <div className="space-y-3">
              {results.literature.top_papers.slice(0, 5).map((paper) => (
                <div key={paper.pmid} className="border-l-2 border-blue-500 pl-4">
                  
                    href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  <a>
                    {paper.title}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-sm text-gray-400 mt-1">
                    PMID: {paper.pmid} &bull; {paper.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Data (Collapsible) */}
        <details className="bg-black/30 rounded-lg p-4 mt-6">
          <summary className="cursor-pointer font-semibold mb-2">
            View Raw Data
          </summary>
          <pre className="text-sm text-gray-300 overflow-auto">
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
    <div className="bg-white/5 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-semibold truncate">{value || 'N/A'}</p>
    </div>
  );
}