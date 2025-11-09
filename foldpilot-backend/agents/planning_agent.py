# agents/planning_agent.py
import re
import logging

logger = logging.getLogger(__name__)

# Common protein names and their UniProt IDs (hardcoded for demo reliability)
PROTEIN_DATABASE = {
    "p53": {"uniprot": "P04637", "organism": "human", "full_name": "TP53"},
    "spike": {"uniprot": "P0DTC2", "organism": "SARS-CoV-2", "full_name": "Spike protein"},
    "hemoglobin": {"uniprot": "P69905", "organism": "human", "full_name": "Hemoglobin subunit alpha"},
    "insulin": {"uniprot": "P01308", "organism": "human", "full_name": "Insulin"},
    "egfr": {"uniprot": "P00533", "organism": "human", "full_name": "EGFR"},
    "brca1": {"uniprot": "P38398", "organism": "human", "full_name": "BRCA1"},
}

def extract_entities(query: str) -> dict:
    """
    Extract protein name, organism, mutations, and analysis type from query
    
    For hackathon: Using regex + lookup table instead of LLM for reliability
    """
    query_lower = query.lower()
    
    result = {
        "query": query,
        "protein": None,
        "organism": "human",
        "mutation": None,
        "analysis_type": "general"
    }
    
    # Extract protein name
    for protein_key, protein_info in PROTEIN_DATABASE.items():
        if protein_key in query_lower:
            result["protein"] = protein_info["full_name"]
            result["organism"] = protein_info["organism"]
            result["uniprot_id"] = protein_info["uniprot"]
            break
    
    # If no match, try to extract capitalized words (likely protein names)
    if not result["protein"]:
        # Look for capitalized words or common patterns
        potential_proteins = re.findall(r'\b[A-Z][A-Za-z0-9]+\b', query)
        if potential_proteins:
            result["protein"] = potential_proteins[0]
            logger.warning(f"Protein '{result['protein']}' not in database, may fail")
    
    # Extract mutations (e.g., R273H, E6V)
    mutation_pattern = r'\b[A-Z]\d+[A-Z]\b'
    mutations = re.findall(mutation_pattern, query)
    if mutations:
        result["mutation"] = mutations[0]
        result["analysis_type"] = "mutation"
    
    # Determine analysis type
    if "drug" in query_lower or "binding" in query_lower or "target" in query_lower:
        result["analysis_type"] = "drug_binding"
    elif "mutation" in query_lower or result["mutation"]:
        result["analysis_type"] = "mutation"
    
    logger.info(f"Extracted entities: {result}")
    return result