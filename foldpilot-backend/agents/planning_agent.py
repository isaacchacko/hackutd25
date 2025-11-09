# agents/planning_agent.py - Enhanced with LLM extraction
import re
import logging
import requests
import os
import json
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Common protein names and their UniProt IDs
PROTEIN_DATABASE = {
    "p53": {"uniprot": "P04637", "organism": "human", "full_name": "TP53"},
    "tp53": {"uniprot": "P04637", "organism": "human", "full_name": "TP53"},
    "spike": {"uniprot": "P0DTC2", "organism": "SARS-CoV-2", "full_name": "Spike protein"},
    "hemoglobin": {"uniprot": "P69905", "organism": "human", "full_name": "Hemoglobin subunit alpha"},
    "insulin": {"uniprot": "P01308", "organism": "human", "full_name": "Insulin"},
    "egfr": {"uniprot": "P00533", "organism": "human", "full_name": "EGFR"},
    "brca1": {"uniprot": "P38398", "organism": "human", "full_name": "BRCA1"},
    "lysozyme": {"uniprot": "P61626", "organism": "human", "full_name": "Lysozyme C"},
}

def extract_entities(query: str) -> dict:
    """
    Extract protein name, organism, mutations, and analysis type from query.
    Uses LLM fallback for unknown proteins.
    """
    query_lower = query.lower()
    
    result = {
        "query": query,
        "protein": None,
        "organism": "human",
        "mutation": None,
        "analysis_type": "general"
    }
    
    # ========================================
    # Step 1: Check hardcoded database first
    # ========================================
    for protein_key, protein_info in PROTEIN_DATABASE.items():
        if protein_key in query_lower:
            result["protein"] = protein_info["full_name"]
            result["organism"] = protein_info["organism"]
            result["uniprot_id"] = protein_info["uniprot"]
            logger.info(f"✓ Matched protein: {protein_key} -> {protein_info['uniprot']}")
            break
    
    # ========================================
    # Step 2: If no match, use LLM to extract protein
    # ========================================
    if not result["protein"]:
        logger.info("Protein not in database - attempting LLM extraction")
        llm_result = extract_protein_with_llm(query)
        
        if llm_result and llm_result.get("protein_name"):
            result["protein"] = llm_result["protein_name"]
            result["organism"] = llm_result.get("organism", "human")
            logger.info(f"LLM extracted: '{result['protein']}' ({result['organism']})")
            
            # Step 3: Look up in UniProt/AlphaFold
            uniprot_id = lookup_uniprot(result["protein"], result["organism"])
            
            if uniprot_id:
                result["uniprot_id"] = uniprot_id
                logger.info(f"✓ Verified in UniProt: {uniprot_id}")
            else:
                # Protein name was extracted but doesn't exist in databases
                result["error"] = f"Protein '{result['protein']}' not found in UniProt/AlphaFold database. Please check the protein name."
                logger.error(result["error"])
        else:
            # LLM extraction completely failed
            logger.error("❌ LLM extraction failed - could not identify protein")
            result["error"] = "Could not identify protein in query. Please specify a valid protein name (e.g., 'p53', 'insulin', 'EGFR')."
    
    # ========================================
    # Step 4: Extract mutations
    # ========================================
    mutation_pattern = r'\b[A-Z]\d+[A-Z]\b'
    mutations = re.findall(mutation_pattern, query)
    if mutations:
        result["mutation"] = mutations[0]
        result["analysis_type"] = "mutation"
    
    # ========================================
    # Step 5: Determine analysis type and whether to analyze binding sites
    # ========================================
    should_analyze_binding = False
    
    # Keywords that indicate binding site analysis is relevant
    binding_keywords = [
        "drug", "binding", "target", "pocket", "druggable", "vaccine", "medication", "analyze",
        "ligand", "inhibitor", "therapeutic", "compound", "interact", "interaction", "describe",
        "small molecule", "drug target", "binding", "site", "reaction", "react", "surface"
    ]
    
    # Check if query is about drug binding, targets, or therapeutic applications
    if any(keyword in query_lower for keyword in binding_keywords):
        result["analysis_type"] = "drug_binding"
        should_analyze_binding = True
        logger.info("✓ Query indicates drug binding analysis needed")
    elif "mutation" in query_lower or result["mutation"]:
        result["analysis_type"] = "mutation"
        should_analyze_binding = False
        logger.info("✓ Query is about mutations - skipping binding analysis")
    else:
        result["analysis_type"] = "general"
        should_analyze_binding = False
        logger.info("✓ General query - skipping binding analysis")
    
    result["should_analyze_binding_sites"] = should_analyze_binding
    
    logger.info(f"Final extraction result: {result}")
    return result


def extract_protein_with_llm(query: str) -> Optional[dict]:
    """
    Use NVIDIA API to extract protein name and organism from query.
    """
    try:
        api_key = os.getenv("NVIDIA_API_KEY")
        
        if api_key:
            logger.info(f"🔑 API key found: {api_key[:6]}...{api_key[-4:]}")
        else:
            logger.error("❌ NVIDIA_API_KEY is None")
            return None
            
        if not api_key:
            return None
        
        logger.info("📞 Calling NVIDIA API...")
        
        prompt = f"""Extract the protein name from this query. Return ONLY JSON.

Query: "{query}"

JSON format:
{{"protein_name": "name", "organism": "human"}}

Examples:
"What is Aurora B?" -> {{"protein_name": "Aurora B", "organism": "human"}}
"Mouse insulin structure" -> {{"protein_name": "insulin", "organism": "mouse"}}

Now extract from the query above. JSON only:"""

        # Try Meta Llama model (more reliable than Nemotron)
        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta/llama-3.1-8b-instruct",  # Changed to working model
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "top_p": 0.7,
                "max_tokens": 100
            },
            timeout=20
        )
        
        logger.info(f"📡 API Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"❌ API error: {response.status_code} - {response.text}")
            return None
        
        result = response.json()
        llm_text = result["choices"][0]["message"]["content"].strip()
        logger.info(f"🤖 LLM response: {llm_text}")
        
        # Clean and parse
        llm_text = llm_text.replace("``````", "").strip()
        json_match = re.search(r'\{.*?\}', llm_text, re.DOTALL)
        
        if json_match:
            parsed = json.loads(json_match.group())
            logger.info(f"✅ Parsed: {parsed}")
            return parsed
        else:
            logger.error(f"❌ No JSON in response")
            return None
            
    except Exception as e:
        logger.error(f"💥 LLM failed: {e}", exc_info=True)
        return None



def lookup_uniprot(protein_name: str, organism: str = "human") -> Optional[str]:
    """
    Look up protein in UniProt database to get UniProt ID.
    This verifies the protein exists before trying AlphaFold.
    
    Returns:
        UniProt ID (e.g., "P04637") or None if not found
    """
    try:
        logger.info(f"Searching UniProt for: '{protein_name}' ({organism})")
        
        # Search UniProt
        url = "https://rest.uniprot.org/uniprotkb/search"
        params = {
            "query": f"({protein_name}) AND (organism_name:{organism})",
            "format": "json",
            "size": 3
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"UniProt API error: {response.status_code}")
            return None
        
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            logger.warning(f"No UniProt entries found for '{protein_name}' in {organism}")
            return None
        
        # Get first result (most relevant)
        uniprot_id = results[0]["primaryAccession"]
        protein_full_name = results[0].get("proteinDescription", {}).get("recommendedName", {}).get("fullName", {}).get("value", "Unknown")
        
        logger.info(f"✓ Found: {uniprot_id} - {protein_full_name}")
        return uniprot_id
            
    except Exception as e:
        logger.error(f"UniProt lookup failed: {e}")
        return None
