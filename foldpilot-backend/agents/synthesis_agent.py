# agents/synthesis_agent.py
import logging
from agents.qa_agent import answer_question

logger = logging.getLogger(__name__)

def synthesize_results(entities: dict, structure_data: dict, literature_data: dict, binding_sites: dict = None) -> str:
    """
    Synthesize results into comprehensive analysis with direct answer to user's question.
    """
    
    protein = entities.get("protein", "Unknown protein")
    organism = entities.get("organism", "human")
    query = entities.get("query", "")
    analysis_type = entities.get("analysis_type", "general")
    
    synthesis_parts = []
    
    # ========================================
    # Part 1: Direct Answer to User's Question (NEW!)
    # ========================================
    synthesis_parts.append(f"# {protein} Analysis\n")
    
    # Generate intelligent answer using QA agent
    answer = answer_question(query, protein, structure_data, literature_data, binding_sites)
    synthesis_parts.append(f"## Answer to Your Question\n\n{answer}\n")
    
    # ========================================
    # Part 2: Technical Details
    # ========================================
    synthesis_parts.append(f"## Technical Details\n")
    
    # Structure section
    if structure_data.get("quality"):
        quality = structure_data["quality"]
        synthesis_parts.append(f"### Structure Quality")
        synthesis_parts.append(f"- **Confidence Score (pLDDT):** {quality['avg_plddt']:.1f}/100 ({quality['confidence']})")
        synthesis_parts.append(f"- **Structure Size:** {quality['num_residues']} residues")
        synthesis_parts.append(f"- **Source:** {structure_data.get('source', 'AlphaFold Database')}\n")
    
    # Binding sites section
    if binding_sites and binding_sites.get("total_pockets", 0) > 0:
        synthesis_parts.append(f"### Binding Site Analysis")
        synthesis_parts.append(f"Detected {binding_sites['total_pockets']} potential drug-binding pockets:\n")
        
        for i, pocket in enumerate(binding_sites["top_pockets"][:3], 1):
            synthesis_parts.append(f"**Pocket {i}:**")
            synthesis_parts.append(f"- Volume: {pocket['volume']:.1f} Ų")
            synthesis_parts.append(f"- Key residues: {', '.join(pocket['residue_names'][:5])}")
            synthesis_parts.append(f"- Description: {pocket['description']}\n")
    
    # Literature section
    if literature_data and literature_data.get("total_papers", 0) > 0:
        synthesis_parts.append(f"### Key Research")
        synthesis_parts.append(f"Based on {literature_data['total_papers']} research papers:\n")
        
        for paper in literature_data["top_papers"][:3]:
            synthesis_parts.append(f"- **{paper['title']}** (PMID: {paper['pmid']}, {paper['year']})")
    
    # Recommendations
    synthesis_parts.append(f"\n### Recommendations for Further Analysis")
    synthesis_parts.append("- Experimental validation of predicted structure")
    synthesis_parts.append("- Molecular dynamics simulations for binding analysis")
    synthesis_parts.append("- Comparison with homologous proteins")
    
    if analysis_type == "drug_binding" and binding_sites:
        synthesis_parts.append("- Virtual screening of drug libraries against identified pockets")
    
    return "\n".join(synthesis_parts)
