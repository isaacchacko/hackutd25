# agents/structure_agent.py
import requests
import logging
import tempfile
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Cache directory
CACHE = {}
CACHE_DIR = tempfile.gettempdir()  # Use system temp directory

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
        
        logger.info(f"Found UniProt ID: {uniprot_id}")
        
        # Check cache first
        cache_key = f"structure_{uniprot_id}"
        if cache_key in CACHE:
            logger.info(f"Returning cached structure for {uniprot_id}")
            return CACHE[cache_key]
        
        # Try multiple AlphaFold URL formats
        urls = [
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v4.pdb",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v3.pdb",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v2.pdb",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v4.cif",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v3.cif",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v2.cif",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v6.pdb",
            f"https://alphafold.ebi.ac.uk/files/AF-{uniprot_id}-F1-model_v6.cif",
        ]
        
        pdb_data = None
        for url in urls:
            logger.info(f"Trying: {url}")
            try:
                response = requests.get(url, timeout=30)
                if response.status_code == 200:
                    pdb_data = response.text
                    logger.info(f"✓ Successfully downloaded from {url}")
                    break
                else:
                    logger.warning(f"Failed: {response.status_code}")
            except Exception as e:
                logger.warning(f"Error with {url}: {e}")
                continue
        
        if pdb_data:
            # Save to file for binding site analysis
            pdb_file_path = os.path.join(CACHE_DIR, f"{uniprot_id}.pdb")
            with open(pdb_file_path, 'w') as f:
                f.write(pdb_data)
            logger.info(f"Saved structure to {pdb_file_path}")
            
            # Calculate quality metrics
            quality = calculate_quality(pdb_data)
            
            result = {
                "uniprot_id": uniprot_id,
                "structure": pdb_data[:1000] + "...",  # Truncated for response
                "structure_full": pdb_data,
                "pdb_file": pdb_file_path,  # ← ADD THIS LINE
                "quality": quality,
                "source": "AlphaFold Database"
            }
            
            # Cache it
            CACHE[cache_key] = result
            logger.info(f"Structure cached for {uniprot_id}")
            
            return result
        else:
            # If AlphaFold fails, try PDB
            logger.warning(f"AlphaFold failed, trying PDB for {uniprot_id}")
            pdb_result = try_pdb_database(uniprot_id)
            if pdb_result:
                return pdb_result
            
            logger.error(f"No structure found for {uniprot_id}")
            return {
                "error": f"Structure not available in AlphaFold or PDB",
                "uniprot_id": uniprot_id
            }
            
    except Exception as e:
        logger.error(f"Error fetching structure: {str(e)}")
        return {
            "error": str(e),
            "uniprot_id": "N/A"
        }

def try_pdb_database(uniprot_id: str) -> Optional[dict]:
    """
    Try to get structure from RCSB PDB as fallback
    """
    try:
        # Search PDB for structures with this UniProt ID
        search_url = f"https://search.rcsb.org/rcsbsearch/v2/query"
        query = {
            "query": {
                "type": "terminal",
                "service": "text",
                "parameters": {
                    "attribute": "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession",
                    "operator": "exact_match",
                    "value": uniprot_id
                }
            },
            "return_type": "entry"
        }
        
        response = requests.post(search_url, json=query, timeout=10)
        if response.status_code == 200:
            results = response.json()
            if results.get("result_set"):
                # Get first PDB ID
                pdb_id = results["result_set"][0]["identifier"]
                logger.info(f"Found PDB entry: {pdb_id}")
                
                # Download PDB file
                pdb_url = f"https://files.rcsb.org/download/{pdb_id}.pdb"
                pdb_response = requests.get(pdb_url, timeout=30)
                
                if pdb_response.status_code == 200:
                    pdb_data = pdb_response.text
                    
                    # Save to file
                    pdb_file_path = os.path.join(CACHE_DIR, f"{uniprot_id}_pdb.pdb")
                    with open(pdb_file_path, 'w') as f:
                        f.write(pdb_data)
                    
                    quality = calculate_quality(pdb_data)
                    
                    return {
                        "uniprot_id": uniprot_id,
                        "structure": pdb_data[:1000] + "...",
                        "structure_full": pdb_data,
                        "pdb_file": pdb_file_path,  # ← ADD THIS LINE
                        "quality": quality,
                        "source": f"PDB ({pdb_id})"
                    }
    except Exception as e:
        logger.warning(f"PDB search failed: {e}")
    
    return None

# Rest of your code stays the same...
def get_uniprot_id(protein_name: str, organism: str) -> Optional[str]:
    """
    Search UniProt for protein ID
    """
    # Hardcoded lookup for demo reliability
    from agents.planning_agent import PROTEIN_DATABASE
    
    protein_lower = protein_name.lower()
    for key, info in PROTEIN_DATABASE.items():
        if key in protein_lower or info["full_name"].lower() in protein_lower:
            logger.info(f"Found in database: {info['uniprot']}")
            return info["uniprot"]
    
    # Try UniProt API as fallback
    try:
        logger.info(f"Searching UniProt API for {protein_name} in {organism}")
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
                uniprot_id = data["results"][0]["primaryAccession"]
                logger.info(f"UniProt API returned: {uniprot_id}")
                return uniprot_id
    except Exception as e:
        logger.error(f"UniProt API failed: {e}")
    
    return None

def calculate_quality(pdb_data: str) -> dict:
    """
    Parse pLDDT scores or resolution from PDB file
    """
    try:
        plddt_scores = []
        is_experimental = False
        resolution = None
        
        for line in pdb_data.split('\n'):
            # Check if it's experimental structure
            if line.startswith('EXPDTA'):
                is_experimental = True
                
            # Get resolution for experimental structures
            if line.startswith('REMARK   2 RESOLUTION'):
                try:
                    resolution = float(line.split()[-2])
                except:
                    pass
            
            # Get B-factors (pLDDT for AlphaFold)
            if line.startswith('ATOM'):
                try:
                    b_factor = float(line[60:66].strip())
                    plddt_scores.append(b_factor)
                except:
                    pass
        
        if plddt_scores:
            avg_plddt = sum(plddt_scores) / len(plddt_scores)
            
            # Different confidence thresholds for experimental vs predicted
            if is_experimental:
                if resolution and resolution < 2.0:
                    confidence = "Very High (Experimental)"
                elif resolution and resolution < 3.0:
                    confidence = "High (Experimental)"
                else:
                    confidence = "Medium (Experimental)"
            else:
                # AlphaFold pLDDT
                if avg_plddt > 90:
                    confidence = "Very High"
                elif avg_plddt > 70:
                    confidence = "High"
                elif avg_plddt > 50:
                    confidence = "Medium"
                else:
                    confidence = "Low"
            
            result = {
                "avg_plddt": round(avg_plddt, 1),
                "confidence": confidence,
                "num_residues": len(plddt_scores)
            }
            
            if resolution:
                result["resolution"] = f"{resolution} Å"
            
            return result
    except Exception as e:
        logger.error(f"Error calculating quality: {e}")
    
    return {
        "avg_plddt": 0.0,
        "confidence": "Unknown",
        "num_residues": 0
    }
