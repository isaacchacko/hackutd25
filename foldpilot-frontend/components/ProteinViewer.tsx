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
                // Disable debug/log window
                // showLog: false,
                // Position controls at bottom
                controlsDisplay: 'portrait',
                regionState: {
                  bottom: 'hidden',
                  left: 'hidden',
                  right: 'hidden',
                  top: 'full',
                },
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

        // Configure layout to show controls at bottom, stacked vertically
        try {
          if (plugin.layout && typeof plugin.layout.setProps === 'function') {
            plugin.layout.setProps({
              controlsDisplay: 'portrait',
            });
            // Set region states to show bottom panel
            plugin.layout.setProps({
              regionState: {
                bottom: 'full',
                left: 'hidden',
                right: 'hidden',
                top: 'hidden',
              },
            });
          }
        } catch (e) {
          console.warn('Could not configure layout programmatically:', e);
        }

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

        // Save original console.error to restore later
        const originalConsoleError = console.error;

        for (const source of structureSources) {
          if (!mounted) break;

          try {
            console.log(`Attempting to load: ${source.url}`);

            // Silence console.error for 404s
            console.error = () => {};

            const data = await plugin.builders.data.download(
              { url: source.url, isBinary: source.isBinary },
              { state: { isGhost: true } }
            );

            // Restore console.error after successful download
            console.error = originalConsoleError;

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
            // Restore console.error on error
            console.error = originalConsoleError;
            lastError = err;
            console.warn(`Failed to load ${source.url}:`, err.message || err);
            continue;
          }
        }

        // Make sure console.error is always restored
        console.error = originalConsoleError;

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

      {/* CSS to hide log panel and debug window, and configure bottom controls */}
      <style jsx>{`
        .molstar-container :global(.msp-layout-region-log) {
          display: none !important;
        }
        .molstar-container :global(.msp-plugin-state) {
          display: none !important;
        }
        .molstar-container :global(.msp-plugin-debug) {
          display: none !important;
        }
        /* Hide any debug-related panels */
        .molstar-container :global([class*="debug"]) {
          display: none !important;
        }
        /* Position controls at bottom and stack vertically */
        .molstar-container :global(.msp-layout-region-bottom) {
          display: flex !important;
          flex-direction: column !important;
        }
        .molstar-container :global(.msp-layout-region-left),
        .molstar-container :global(.msp-layout-region-right),
        .molstar-container :global(.msp-layout-region-top) {
          display: none !important;
        }
        /* Stack control elements vertically */
        .molstar-container :global(.msp-layout-region-bottom > *) {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default ProteinViewer;
