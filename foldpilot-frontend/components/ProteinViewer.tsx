'use client';

import { useEffect, useRef, useState } from 'react';
import { Dna, ExternalLink, AlertCircle } from 'lucide-react';

interface ProteinViewerProps {
  uniprotId?: string;
}

const ProteinViewer = ({ uniprotId = "P04637" }: ProteinViewerProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<any>(null);
  const isInitializingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initViewer = async () => {
      if (isInitializingRef.current) {
        console.log('Already initializing, skipping...');
        return;
      }

      try {
        isInitializingRef.current = true;
        setLoading(true);
        setError(null);

        if (pluginRef.current) {
          console.log('Disposing previous plugin instance');
          try {
            pluginRef.current.dispose?.();
          } catch (e) {
            console.warn('Error disposing plugin:', e);
          }
          pluginRef.current = null;
        }

        if (!parentRef.current) return;

        while (parentRef.current.firstChild) {
          parentRef.current.removeChild(parentRef.current.firstChild);
        }

        const cleanUniprotId = uniprotId.split('-')[0];
        console.log(`Loading structure for: ${cleanUniprotId}`);

        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');

        if (!mounted || !parentRef.current) return;

        const plugin = await createPluginUI({
          target: parentRef.current,
          render: renderReact18,
          spec: {
            ...DefaultPluginUISpec(),
            layout: {
              initial: {
                isExpanded: false,
                showControls: true,
              },
            },
            components: {
              ...DefaultPluginUISpec().components,
              remoteState: 'none',
            },
          },
        });

        if (!mounted) {
          plugin.dispose?.();
          return;
        }

        pluginRef.current = plugin;

        const structureSources = [
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v8.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v7.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v6.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v5.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v4.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v3.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v2.pdb`, format: 'pdb' as const, isBinary: false },
          
          ...(cleanUniprotId === 'P0DTC2' ? [
            { url: 'https://files.rcsb.org/download/6VXX.pdb', format: 'pdb' as const, isBinary: false },
            { url: 'https://files.rcsb.org/download/6VYB.pdb', format: 'pdb' as const, isBinary: false },
          ] : []),
          
          ...(cleanUniprotId === 'P04637' ? [
            { url: 'https://files.rcsb.org/download/1TUP.pdb', format: 'pdb' as const, isBinary: false },
            { url: 'https://files.rcsb.org/download/1TSR.pdb', format: 'pdb' as const, isBinary: false },
          ] : []),
        ];

        let loaded = false;
        let lastError: any = null;

        for (const source of structureSources) {
          if (!mounted) break;

          try {
            console.log(`Attempting to load: ${source.url}`);

            const data = await plugin.builders.data.download(
              { url: source.url, isBinary: source.isBinary },
              { state: { isGhost: true } }
            );

            if (!mounted) break;

            const trajectory = await plugin.builders.structure.parseTrajectory(
              data,
              source.format
            );

            if (!mounted) break;

            await plugin.builders.structure.hierarchy.applyPreset(
              trajectory,
              'default'
            );

            loaded = true;
            console.log(`✓ Successfully loaded from: ${source.url}`);
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`Failed to load ${source.url}:`, err.message || err);
            continue;
          }
        }

        if (!loaded) {
          const errorMsg = lastError?.message || 'Unknown error';
          throw new Error(
            `Could not load structure for ${cleanUniprotId}. Last error: ${errorMsg}`
          );
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Mol* viewer error:', err);
        if (mounted) {
          setError(err.message || 'Failed to load structure');
          setLoading(false);
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

    initViewer();

    return () => {
      mounted = false;
      isInitializingRef.current = false;
      
      if (pluginRef.current) {
        console.log('Cleanup: disposing plugin');
        try {
          pluginRef.current.dispose?.();
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
        pluginRef.current = null;
      }
    };
  }, [uniprotId]);

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden animate-fade-in-up mb-8">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black rounded-lg">
            <Dna className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-black" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
              3D Protein Structure
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              UniProt ID: <span className="font-mono font-medium text-black">{uniprotId}</span>
              {uniprotId !== uniprotId.split('-')[0] && (
                <span className="ml-2 text-xs text-amber-600 font-medium">
                  (Canonical: {uniprotId.split('-')[0]})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Viewer Container */}
      <div className="relative bg-white molstar-container">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="inline-block relative mb-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
              </div>
              <p className="text-sm text-gray-600 font-medium">Loading 3D structure...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 p-8">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-full mb-4">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h4 className="text-black font-bold text-lg mb-2">Structure Load Failed</h4>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">{error}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href={`https://alphafold.ebi.ac.uk/entry/${uniprotId.split('-')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-all text-sm font-semibold shadow-lg transform hover:scale-105"
                >
                  AlphaFold Database
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a 
                  href={`https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22parameters%22%3A%7B%22value%22%3A%22${uniprotId.split('-')[0]}%22%7D%2C%22type%22%3A%22terminal%22%2C%22service%22%3A%22text%22%7D%2C%22return_type%22%3A%22entry%22%7D`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-black border border-gray-200 rounded-lg transition-all text-sm font-semibold"
                >
                  RCSB PDB
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div
          ref={parentRef}
          style={{
            width: '100%',
            height: 400,
            minHeight: 400,
            position: 'relative',
          }}
        />
      </div>

      {/* CSS to hide log panel */}
      <style jsx>{`
        .molstar-container :global(.msp-layout-region-log) {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default ProteinViewer;
