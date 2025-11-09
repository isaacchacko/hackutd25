// src/components/BindingSitesPanel.tsx
import { useState } from 'react';
import { BindingSiteAnalysis } from '@/types';
import { Target, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

// Function to handle residue chip click - scrolls to molstar and clicks on sequence
const handleResidueClick = (residueNumber: number) => {
  // First, scroll to the molstar viewer with smooth animation
  // Try container ID first, then fallback to class
  const molstarViewer = document.getElementById('molstar-viewer-container') ||
    document.querySelector('.molstar-container');

  if (molstarViewer) {
    molstarViewer.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Wait for scroll to complete, then find and click the residue
    setTimeout(() => {
      // Calculate the seqid (0-indexed, so residueNumber - 1)
      const seqid = residueNumber - 1;

      // Find the element with data-seqid matching our calculated value
      // Search in the entire document, but prefer elements within molstar containers
      const molstarContainer = document.querySelector('.molstar-container');
      const searchRoot = molstarContainer || document;

      // Look for the element with the matching data-seqid
      const targetElement = searchRoot.querySelector(
        `span[data-seqid="${seqid}"].msp-sequence-present`
      ) as HTMLElement;

      if (targetElement) {
        // First, ensure the element is visible and in viewport
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Wait a bit more for the scroll to complete, then interact
        setTimeout(() => {
          // Focus the element first
          targetElement.focus();
          
          // Get the element's bounding box to calculate click coordinates
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          // Create a more complete mouse event sequence
          // This simulates a real user click more accurately
          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0
          });
          
          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0
          });
          
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0
          });
          
          // Dispatch events in the correct order
          targetElement.dispatchEvent(mouseDownEvent);
          setTimeout(() => {
            targetElement.dispatchEvent(mouseUpEvent);
            setTimeout(() => {
              targetElement.dispatchEvent(clickEvent);
            }, 10);
          }, 10);
          
          // Also try the direct click method as a fallback
          setTimeout(() => {
            targetElement.click();
          }, 50);

          // Add a visual highlight temporarily
          const originalBg = targetElement.style.backgroundColor;
          const originalOutline = targetElement.style.outline;
          targetElement.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
          targetElement.style.outline = '2px solid rgba(59, 130, 246, 0.8)';
          setTimeout(() => {
            targetElement.style.backgroundColor = originalBg;
            targetElement.style.outline = originalOutline;
          }, 1000);
        }, 300); // Wait 300ms for element scroll to complete
      } else {
        console.warn(`Could not find element with data-seqid="${seqid}" for residue ${residueNumber}`);
      }
    }, 800); // Wait 800ms for initial scroll animation to complete
  } else {
    console.warn('Could not find molstar viewer');
  }
};

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
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/80 rounded p-2 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Volume</p>
          <p className="font-semibold text-black">{pocket.volume.toFixed(0)} Ų</p>
        </div>
        <div className="bg-white/80 rounded p-2 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Residues</p>
          <p className="font-semibold text-black">{pocket.num_residues}</p>
        </div>
      </div>

      {/* Residues Preview */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100 font-medium">
          View residues ({pocket.residues.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1">
          {pocket.residue_names.slice(0, 15).map((name, idx) => {
            const residueNumber = pocket.residues[idx];
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  handleResidueClick(residueNumber);
                }}
                className="text-xs bg-white px-2 py-1 rounded border border-gray-300 font-mono hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 cursor-pointer transition-all active:scale-95"
                title={`Click to highlight residue ${residueNumber} in 3D viewer`}
              >
                {name}{residueNumber}
              </button>
            );
          })}
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
