# agents/binding_agent.py
import logging
from Bio.PDB import PDBParser, NeighborSearch, Selection
import numpy as np
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

def find_binding_sites_simple(pdb_file: str) -> Dict:
    """
    Simplified geometric pocket detection for drug binding sites.
    Uses adaptive thresholds to handle different protein structures.
    """
    try:
        logger.info(f"Analyzing binding sites in {pdb_file}")
        
        # Parse PDB structure
        parser = PDBParser(QUIET=True)
        structure = parser.get_structure('protein', pdb_file)
        
        # Get first model
        model = structure[0]
        
        # Get all atoms
        all_atoms = list(Selection.unfold_entities(model, 'A'))
        
        if len(all_atoms) == 0:
            logger.warning("No atoms found in structure")
            return {
                "total_pockets": 0,
                "top_pockets": [],
                "method": "geometric_heuristic",
                "note": "Structure contains no atoms"
            }
        
        logger.info(f"Found {len(all_atoms)} atoms in structure")
        
        # Find surface residues with adaptive method
        surface_residues = find_surface_residues_adaptive(model, all_atoms)
        
        if len(surface_residues) == 0:
            logger.warning("No surface residues detected")
            return {
                "total_pockets": 0,
                "top_pockets": [],
                "method": "geometric_heuristic",
                "note": "No surface residues detected - structure may be unusual"
            }
        
        logger.info(f"Found {len(surface_residues)} surface residues")
        
        # Find potential pockets
        pockets = find_pockets_clustered(surface_residues, all_atoms)
        
        logger.info(f"Detected {len(pockets)} potential binding pockets")
        
        return {
            "total_pockets": len(pockets),
            "top_pockets": pockets[:5],
            "method": "geometric_heuristic",
            "note": "For precise analysis, experimental validation recommended"
        }
        
    except Exception as e:
        logger.error(f"Binding site detection failed: {e}", exc_info=True)
        return {
            "total_pockets": 0,
            "top_pockets": [],
            "error": str(e),
            "method": "geometric_heuristic"
        }


def find_surface_residues_adaptive(model, all_atoms: List) -> List:
    """
    Find surface residues using adaptive percentile-based threshold.
    This works for any protein structure size.
    """
    try:
        # Build neighbor search tree
        ns = NeighborSearch(all_atoms)
        
        # Collect all residues with CA atoms
        residues_with_ca = []
        for chain in model:
            for residue in chain:
                # Skip non-standard residues (water, ions, ligands)
                if residue.id[0] != ' ':
                    continue
                
                # Must have CA atom
                if 'CA' not in residue:
                    continue
                
                ca_atom = residue['CA']
                residues_with_ca.append((residue, ca_atom))
        
        total_residues = len(residues_with_ca)
        
        if total_residues == 0:
            logger.warning("No valid residues with CA atoms found")
            return []
        
        logger.info(f"Processing {total_residues} residues")
        
        # Count neighbors for each residue
        neighbor_counts = []
        for residue, ca_atom in residues_with_ca:
            neighbors = ns.search(ca_atom.coord, 10.0, level='A')
            neighbor_counts.append(len(neighbors))
        
        # Calculate adaptive threshold using percentiles
        sorted_counts = sorted(neighbor_counts)
        
        # Use 70th percentile as surface threshold
        # This means top 30% most exposed residues are "surface"
        percentile_70 = sorted_counts[int(len(sorted_counts) * 0.7)]
        
        logger.info(f"Neighbor count range: {min(neighbor_counts)} - {max(neighbor_counts)}")
        logger.info(f"Using 70th percentile threshold: {percentile_70} neighbors")
        
        # Classify surface residues
        surface_residues = []
        for (residue, ca_atom), neighbor_count in zip(residues_with_ca, neighbor_counts):
            if neighbor_count <= percentile_70:
                surface_residues.append({
                    'residue': residue,
                    'residue_id': residue.id[1],
                    'residue_name': residue.resname,
                    'ca_coord': ca_atom.coord.copy(),
                    'neighbor_count': neighbor_count
                })
        
        # Ensure we have at least 30% of residues as surface
        min_surface = max(20, int(total_residues * 0.3))
        
        if len(surface_residues) < min_surface:
            logger.warning(f"Only {len(surface_residues)} surface residues - expanding to {min_surface}")
            
            # Sort all residues by neighbor count and take top 30%
            residue_data = list(zip(residues_with_ca, neighbor_counts))
            residue_data.sort(key=lambda x: x[1])  # Sort by neighbor count
            
            surface_residues = []
            for (residue, ca_atom), neighbor_count in residue_data[:min_surface]:
                surface_residues.append({
                    'residue': residue,
                    'residue_id': residue.id[1],
                    'residue_name': residue.resname,
                    'ca_coord': ca_atom.coord.copy(),
                    'neighbor_count': neighbor_count
                })
        
        logger.info(f"Selected {len(surface_residues)} surface residues ({100*len(surface_residues)/total_residues:.1f}% of total)")
        
        return surface_residues
        
    except Exception as e:
        logger.error(f"Surface residue detection failed: {e}", exc_info=True)
        return []


def find_pockets_clustered(surface_residues: List[Dict], all_atoms: List) -> List[Dict]:
    """
    Identify binding pockets by clustering nearby surface residues.
    """
    try:
        if len(surface_residues) < 10:
            logger.warning("Too few surface residues for pocket detection")
            return []
        
        # Extract coordinates
        coords = np.array([res['ca_coord'] for res in surface_residues])
        
        pockets = []
        visited = set()
        
        # Sample every 5th residue for efficiency (adjust based on size)
        sampling_rate = max(1, len(surface_residues) // 100)
        sample_indices = list(range(0, len(surface_residues), sampling_rate))
        
        logger.info(f"Sampling {len(sample_indices)} residues for pocket detection")
        
        for i in sample_indices:
            if i in visited:
                continue
            
            center = coords[i]
            
            # Find nearby surface residues (within 15 Angstroms)
            distances = np.linalg.norm(coords - center, axis=1)
            nearby_indices = np.where((distances > 0.1) & (distances < 15.0))[0]
            
            # Pocket needs at least 10 nearby surface residues
            if len(nearby_indices) >= 10:
                # Mark as visited
                visited.add(i)
                for idx in nearby_indices:
                    visited.add(int(idx))
                
                # Calculate pocket properties
                pocket_coords = coords[nearby_indices]
                pocket_center = np.mean(pocket_coords, axis=0)
                
                # Estimate volume (sphere encompassing all points)
                max_dist = np.max(np.linalg.norm(pocket_coords - pocket_center, axis=1))
                volume = (4/3) * np.pi * (max_dist ** 3)
                
                # Get residue details
                residue_ids = [surface_residues[idx]['residue_id'] for idx in nearby_indices[:15]]
                residue_names = [surface_residues[idx]['residue_name'] for idx in nearby_indices[:15]]
                
                # Score pocket (larger volume + more residues = better)
                score = volume * 0.01 + len(nearby_indices)
                
                pocket = {
                    "pocket_id": len(pockets) + 1,
                    "volume": float(round(volume, 1)),  # ✓ Convert to Python float
                    "center": [float(round(c, 2)) for c in pocket_center.tolist()],  # ✓ Convert each coordinate
                    "num_residues": int(len(nearby_indices)),  # ✓ Ensure it's Python int
                    "residues": [int(r) for r in residue_ids],  # ✓ Convert numpy ints
                    "residue_names": residue_names,  # Already strings
                    "score": float(round(score, 2)),  # ✓ Convert to Python float
                    "confidence": "MEDIUM",
                    "description": f"Pocket with {len(nearby_indices)} surface residues, volume {float(round(volume, 1)):.1f} Ų"
                }
                
                pockets.append(pocket)
                
                # Stop after finding 10 pockets
                if len(pockets) >= 10:
                    break
        
        # Sort by score (larger volume + more residues = better target)
        pockets.sort(key=lambda x: x['score'], reverse=True)
        
        logger.info(f"Found {len(pockets)} pockets, top score: {pockets[0]['score'] if pockets else 0}")
        
        return pockets
        
    except Exception as e:
        logger.error(f"Pocket detection failed: {e}", exc_info=True)
        return []
