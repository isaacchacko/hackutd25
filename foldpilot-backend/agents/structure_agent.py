# agents/structure_agent.py
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Cache directory (we'll implement this simply)
CACHE = {}

def get_protein_structure(protein_name: str, organism: str = "human") -> dict:
    """
    Fetch protein structure from AlphaFold Database
    """
    try:
        # Get UniProt ID
        uniprot_id = get_uniprot_id(protein_name, organism)
        
        if not uniprot_id:
            return {
                "error": "Could not find UniProt ID",
                "uniprot_id": "N/A"
            }
        
        # Check cache first
        cache_key = f"structure_{uniprot_id}"
        if cache_key in CACHE:
            logger.info(f"Returning cached structure for {uniprot_id}")
            return CACHE[cache_key]
        
        # Download from AlphaFold
        logger.info(f"Downloading structure for {uniprot_id}")
        url = f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v4.pdb"
        
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            pdb_data = response.text
            
            # Calculate quality metrics (simplified)
            quality = calculate_quality(pdb_data)
            
            result = {
                "uniprot_id": uniprot_id,
                "structure": pdb_data[:1000] + "...",  # Truncated for demo
                "structure_full": pdb_data,
                "quality": quality,
                "source": "AlphaFold Database"
            }
            
            # Cache it
            CACHE[cache_key] = result
            
            return result
        else:
            logger.error(f"Failed to download structure: {response.status_code}")
            return {
                "error": f"Structure not found (HTTP {response.status_code})",
                "uniprot_id": uniprot_id
            }
            
    except Exception as e:
        logger.error(f"Error fetching structure: {str(e)}")
        return {
            "error": str(e),
            "uniprot_id": "N/A"
        }

def get_uniprot_id(protein_name: str, organism: str) -> Optional[str]:
    """
    Search UniProt for protein ID
    """
    # Hardcoded lookup for demo reliability
    from agents.planning_agent import PROTEIN_DATABASE
    
    protein_lower = protein_name.lower()
    for key, info in PROTEIN_DATABASE.items():
        if key in protein_lower or info["full_name"].lower() in protein_lower:
            return info["uniprot"]
    
    # Try UniProt API as fallback
    try:
        url = "https://rest.uniprot.org/uniprotkb/search"
        params = {
            "query": f"({protein_name}) AND (organism_name:{organism})",
            "format": "json",
            "size": 1
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                return data["results"][0]["primaryAccession"]
    except:
        pass
    
    return None

def calculate_quality(pdb_data: str) -> dict:
    """
    Parse pLDDT scores from PDB file
    """
    try:
        plddt_scores = []
        for line in pdb_data.split('\n'):
            if line.startswith('ATOM'):
                # pLDDT is in the B-factor column
                b_factor = float(line[60:66].strip())
                plddt_scores.append(b_factor)
        
        if plddt_scores:
            avg_plddt = sum(plddt_scores) / len(plddt_scores)
            
            if avg_plddt > 90:
                confidence = "Very High"
            elif avg_plddt > 70:
                confidence = "High"
            elif avg_plddt > 50:
                confidence = "Medium"
            else:
                confidence = "Low"
            
            return {
                "avg_plddt": round(avg_plddt, 1),
                "confidence": confidence,
                "num_residues": len(plddt_scores)
            }
    except:
        pass
    
    return {
        "avg_plddt": 0.0,
        "confidence": "Unknown",
        "num_residues": 0
    }