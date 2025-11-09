import { useEffect, useRef } from 'react';

const FIXED_UNIPROT_ID = "A0A2K6V5L6"; // Always show this structure

const ProteinViewer = () => {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('molstar/build/viewer/molstar.js').then((molstarModule) => {
      const MolStar = molstarModule.default || molstarModule;
      if (viewerRef.current && MolStar && MolStar.Viewer) {
        MolStar.Viewer.create(viewerRef.current, {}).then((viewer: any) => {
          const url = `https://alphafold.ebi.ac.uk/files/AF-${FIXED_UNIPROT_ID}-F1-model_v4.pdb`;
          viewer.loadStructureFromUrl(url, 'pdb').catch(() => {
            alert('Structure not found');
          });
        });
      }
    });
  }, []);

  return (
    <div>
      <div>Displaying 3D structure for UniProt ID: {FIXED_UNIPROT_ID}</div>
      <div ref={viewerRef} style={{
        width: '100%',
        height: 500,
        borderRadius: 10,
        margin: '24px 0',
        background: '#fff',
        minHeight: 400,
      }}/>
    </div>
  );
};

export default ProteinViewer;
