'use client';

import { useEffect, useRef, useState } from 'react';

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
      // Prevent multiple simultaneous initializations (fixes React.StrictMode double-render)
      if (isInitializingRef.current) {
        console.log('Already initializing, skipping...');
        return;
      }

      try {
        isInitializingRef.current = true;
        setLoading(true);
        setError(null);

        // Cleanup previous instance
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

        // Completely clear the container (fixes createRoot() error)
        while (parentRef.current.firstChild) {
          parentRef.current.removeChild(parentRef.current.firstChild);
        }

        const cleanUniprotId = uniprotId.split('-')[0];
        console.log(`Loading structure for: ${cleanUniprotId}`);

        // Import Mol* modules
        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');

        if (!mounted || !parentRef.current) return;

        // Create Mol* plugin
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
          },
        });

        if (!mounted) {
          plugin.dispose?.();
          return;
        }

        pluginRef.current = plugin;

        // Structure sources - PDB format prioritized for reliability
        const structureSources = [
          // AlphaFold PDB files (v8 down to v2 - tries latest first)
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v8.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v7.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v6.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v5.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v4.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v3.pdb`, format: 'pdb' as const, isBinary: false },
          { url: `https://alphafold.ebi.ac.uk/files/AF-${cleanUniprotId}-F1-model_v2.pdb`, format: 'pdb' as const, isBinary: false },
          
          // Experimental structure fallbacks for specific proteins
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

        // Try each structure source
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">3D Protein Structure</h3>
        <p className="text-sm text-gray-600 mt-1">
          UniProt ID: <span className="font-mono font-medium">{uniprotId}</span>
          {uniprotId !== uniprotId.split('-')[0] && (
            <span className="ml-2 text-xs text-amber-600">
              (Canonical form: {uniprotId.split('-')[0]})
            </span>
          )}
        </p>
      </div>
      
      <div className="relative bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading 3D structure...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 p-4">
            <div className="text-center max-w-md">
              <p className="text-red-800 font-medium mb-2">⚠️ Structure Load Failed</p>
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <div className="text-xs text-gray-600 space-y-2">
                <p className="font-medium">Try viewing directly at:</p>
                <a 
                  href={`https://alphafold.ebi.ac.uk/entry/${uniprotId.split('-')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block"
                >
                  AlphaFold Database →
                </a>
                <a 
                  href={`https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22parameters%22%3A%7B%22value%22%3A%22${uniprotId.split('-')[0]}%22%7D%2C%22type%22%3A%22terminal%22%2C%22service%22%3A%22text%22%7D%2C%22return_type%22%3A%22entry%22%7D`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block"
                >
                  RCSB PDB →
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div
          ref={parentRef}
          style={{
            width: '100%',
            height: 600,
            minHeight: 400,
            position: 'relative',
          }}
        />
      </div>
    </div>
  );
};

export default ProteinViewer;
