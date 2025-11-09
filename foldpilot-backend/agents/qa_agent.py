# agents/qa_agent.py
import os
import logging
import requests
from typing import Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

def answer_question(
    query: str,
    protein: str,
    structure_data: Dict,
    literature_data: Dict,
    binding_sites: Optional[Dict] = None
) -> str:
    """
    Use LLM to answer the user's specific question using all gathered data.
    
    Args:
        query: Original user question
        protein: Protein name
        structure_data: Structure and quality information
        literature_data: Literature search results
        binding_sites: Binding site information (optional)
        
    Returns:
        Detailed answer to the user's question
    """
    try:
        logger.info(f"Generating answer for query: {query}")
        
        # Build context from all available data
        context = build_context(protein, structure_data, literature_data, binding_sites)
        
        # Call LLM to generate answer
        answer = generate_answer_with_llm(query, protein, context)
        
        if answer:
            logger.info("✅ Answer generated successfully")
            return answer
        else:
            logger.warning("⚠️ LLM failed to generate answer - using fallback")
            return generate_fallback_answer(query, protein, structure_data, literature_data)
            
    except Exception as e:
        logger.error(f"QA agent failed: {e}", exc_info=True)
        return generate_fallback_answer(query, protein, structure_data, literature_data)


def build_context(
    protein: str,
    structure_data: Dict,
    literature_data: Dict,
    binding_sites: Optional[Dict]
) -> str:
    """
    Build comprehensive context from all gathered data.
    """
    context_parts = []
    
    # Structure information
    if structure_data.get("quality"):
        quality = structure_data["quality"]
        context_parts.append(f"""
STRUCTURE INFORMATION:
- Protein: {protein}
- UniProt ID: {structure_data.get('uniprot_id', 'Unknown')}
- Structure Quality (pLDDT): {quality.get('avg_plddt', 0)}/100
- Confidence: {quality.get('confidence', 'Unknown')}
- Number of residues: {quality.get('num_residues', 0)}
- Source: {structure_data.get('source', 'AlphaFold')}
""")
    
    # Binding sites information
    if binding_sites and binding_sites.get("total_pockets", 0) > 0:
        context_parts.append(f"""
BINDING SITES:
- Total pockets detected: {binding_sites['total_pockets']}
- Method: {binding_sites.get('method', 'Unknown')}
""")
        
        # Add top 3 pockets
        for i, pocket in enumerate(binding_sites.get("top_pockets", [])[:3], 1):
            context_parts.append(f"""
  Pocket {i}:
  - Volume: {pocket.get('volume', 0):.1f} Ų
  - Key residues: {', '.join(pocket.get('residue_names', [])[:5])}
  - Location: {pocket.get('residues', [])[:5]}
""")
    
    # Literature information
    if literature_data and literature_data.get("total_papers", 0) > 0:
        context_parts.append(f"""
LITERATURE FINDINGS:
- Total papers found: {literature_data['total_papers']}
- Key findings: {literature_data.get('key_findings', 'N/A')}
""")
        
        # Add abstracts from top papers
        for i, paper in enumerate(literature_data.get("top_papers", [])[:3], 1):
            context_parts.append(f"""
Paper {i}: {paper.get('title', 'Untitled')} ({paper.get('year', 'N/A')})
PMID: {paper.get('pmid', 'N/A')}
Abstract: {paper.get('abstract', 'No abstract available')[:500]}...
""")
    
    return "\n".join(context_parts)


def generate_answer_with_llm(query: str, protein: str, context: str) -> Optional[str]:
    """
    Use NVIDIA LLM to generate a detailed answer based on gathered data.
    """
    try:
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            logger.error("NVIDIA_API_KEY not found")
            return None
        
        logger.info("📞 Calling NVIDIA LLM for answer generation...")
        
        # Construct prompt for answer generation
        prompt = f"""You are a protein biology expert assistant. Answer the user's question using ONLY the provided scientific data.

USER QUESTION: "{query}"

PROTEIN: {protein}

AVAILABLE DATA:
{context}

INSTRUCTIONS:
1. Answer the user's specific question directly
2. Use ONLY information from the provided data above
3. Be specific and cite evidence (e.g., "According to the AlphaFold structure..." or "Research shows...")
4. If the question asks about drug targets, mention binding pockets if available
5. If the question asks about structure, mention pLDDT scores and confidence
6. Keep your answer concise (3-5 paragraphs maximum)
7. Use clear, accessible language while maintaining scientific accuracy
8. If the data doesn't contain enough information to fully answer, acknowledge this

ANSWER:"""

        response = requests.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta/llama-3.1-8b-instruct",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful protein biology expert who provides accurate, evidence-based answers."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,  # Lower temperature for factual accuracy
                "top_p": 0.9,
                "max_tokens": 1000
            },
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"NVIDIA API error: {response.status_code}")
            return None
        
        answer = response.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"🤖 Generated answer ({len(answer)} chars)")
        
        return answer
        
    except Exception as e:
        logger.error(f"LLM answer generation failed: {e}")
        return None


def generate_fallback_answer(
    query: str,
    protein: str,
    structure_data: Dict,
    literature_data: Dict
) -> str:
    """
    Generate a basic answer without LLM (fallback).
    """
    answer_parts = [f"## Answer for: {query}\n"]
    
    # Structure info
    if structure_data.get("quality"):
        quality = structure_data["quality"]
        answer_parts.append(f"""
**Structure Analysis:**
{protein} has been analyzed using AlphaFold with a pLDDT confidence score of {quality.get('avg_plddt', 0):.1f}, 
indicating {quality.get('confidence', 'unknown').lower()} confidence in the predicted structure. 
The structure contains {quality.get('num_residues', 0)} residues.
""")
    
    # Literature info
    if literature_data and literature_data.get("total_papers", 0) > 0:
        answer_parts.append(f"""
**Research Context:**
{literature_data['total_papers']} research papers have been published about {protein}. 
Current research focuses on: {literature_data.get('key_findings', 'various aspects of the protein')}.
""")
    
    answer_parts.append("""
For more detailed information, please refer to the structure quality metrics and literature abstracts provided.
""")
    
    return "\n".join(answer_parts)
