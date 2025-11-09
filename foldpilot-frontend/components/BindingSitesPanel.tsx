// src/components/BindingSitesPanel.tsx
import { useState } from 'react';
import { BindingSiteAnalysis } from '@/types';
import { Target, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

interface BindingSitesPanelProps {
  bindingSites: BindingSiteAnalysis;
}

export default function BindingSitesPanel({ bindingSites }: BindingSitesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!bindingSites || bindingSites.total_pockets === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-yellow-200 animate-slide-in-up-delay-2">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-lg text-black">Drug Binding Sites</h3>
        </div>
        <p className="text-gray-600 text-sm">
          {bindingSites?.note || 'No binding pockets detected in this structure.'}
        </p>
      </div>
    );
  }

  const displayedPockets = isExpanded 
    ? bindingSites.top_pockets 
    : bindingSites.top_pockets.slice(0, 1);
  const remainingCount = isExpanded ? 0 : bindingSites.top_pockets.length - 1;

  return (
    <div className="bg-white rounded-lg p-6 border border-blue-200 animate-slide-in-up-delay-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-xl text-black">Drug Binding Sites</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 px-3 py-1 rounded-full">
            <span className="text-blue-700 font-semibold text-sm">
              {bindingSites.total_pockets} pockets found
            </span>
          </div>
          {bindingSites.top_pockets.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium text-sm"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All ({remainingCount} more)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Method: <span className="text-black font-medium">{bindingSites.method}</span>
        {bindingSites.note && (
          <span className="ml-2 italic">• {bindingSites.note}</span>
        )}
      </p>

      {/* Top Pockets Grid */}
      <div className="grid grid-cols-1 gap-4">
        {displayedPockets.map((pocket, index) => (
          <PocketCard key={pocket.pocket_id} pocket={pocket} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

interface PocketCardProps {
  pocket: {
    pocket_id: number;
    volume: number;
    center: number[];
    num_residues: number;
    residues: number[];
    residue_names: string[];
    score: number;
    confidence: string;
    description: string;
  };
  rank: number;
}

function PocketCard({ pocket, rank }: PocketCardProps) {
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-400 text-yellow-700';
    if (rank === 2) return 'bg-gray-50 border-gray-400 text-gray-700';
    if (rank === 3) return 'bg-orange-50 border-orange-400 text-orange-700';
    return 'bg-blue-50 border-blue-300 text-blue-700';
  };

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'HIGH') return 'text-green-600';
    if (confidence === 'MEDIUM') return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🎯';
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getRankStyle(rank)}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getRankIcon(rank)}</span>
            <span className="text-2xl font-bold">#{rank}</span>
            <span className="text-sm opacity-75">Pocket {pocket.pocket_id}</span>
          </div>
          <p className="text-xs opacity-75 mt-1">{pocket.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-75">Druggability Score</p>
          <p className="text-2xl font-bold">{pocket.score.toFixed(1)}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white/80 rounded p-2 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Volume</p>
          <p className="font-semibold text-black">{pocket.volume.toFixed(0)} Ų</p>
        </div>
        <div className="bg-white/80 rounded p-2 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Residues</p>
          <p className="font-semibold text-black">{pocket.num_residues}</p>
        </div>
        <div className="bg-white/80 rounded p-2 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Confidence</p>
          <p className={`font-semibold ${getConfidenceColor(pocket.confidence)}`}>
            {pocket.confidence}
          </p>
        </div>
      </div>

      {/* Center Coordinates */}
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 opacity-75" />
        <p className="text-xs">
          Center: ({pocket.center[0].toFixed(1)}, {pocket.center[1].toFixed(1)}, {pocket.center[2].toFixed(1)})
        </p>
      </div>

      {/* Residues Preview */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100 font-medium">
          View residues ({pocket.residues.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1">
          {pocket.residue_names.slice(0, 15).map((name, idx) => (
            <span
              key={idx}
              className="text-xs bg-white px-2 py-1 rounded border border-gray-300 font-mono"
              title={`Residue ${pocket.residues[idx]}`}
            >
              {name}{pocket.residues[idx]}
            </span>
          ))}
          {pocket.residues.length > 15 && (
            <span className="text-xs opacity-50 px-2 py-1">
              +{pocket.residues.length - 15} more
            </span>
          )}
        </div>
      </details>
    </div>
  );
}