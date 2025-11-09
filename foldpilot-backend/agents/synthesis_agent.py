# agents/synthesis_agent.py
import logging

logger = logging.getLogger(__name__)

def synthesize_results(entities: dict, structure_data: dict, literature_data: dict) -> str:
    """
    Synthesize results into a readable summary
    
    For MVP: Simple template-based synthesis (no LLM needed)
    Later: Can add Nemotron API for fancier text
    """
    
    protein = entities.get("protein", "Unknown protein")
    organism = entities.get("organism", "human")
    mutation = entities.get("mutation")
    analysis_type = entities.get("analysis_type", "general")
    
    # Build synthesis based on available data
    synthesis_parts = []
    
    # Header
    synthesis_parts.append(f"# Analysis of {protein} from {organism}\n")
    
    # Structure section
    if structure_data.get("quality"):
        quality = structure_data["quality"]
        synthesis_parts.append(f"\n## Structure Quality")
        synthesis_parts.append(f"The protein structure has an average pLDDT confidence score of {quality['avg_plddt']}, indicating {quality['confidence'].lower()} confidence in the predicted structure.")
        synthesis_parts.append(f"Structure contains {quality['num_residues']} residues.")
    
    # Mutation analysis
    if mutation and analysis_type == "mutation":
        synthesis_parts.append(f"\n## Mutation Analysis: {mutation}")
        synthesis_parts.append(f"This query asks about the {mutation} mutation in {protein}.")
        synthesis_parts.append("Based on structural analysis, mutations in critical domains can affect protein stability and function.")
    
    # Literature section
    if literature_data.get("total_papers", 0) > 0:
        synthesis_parts.append(f"\n## Literature Evidence")
        synthesis_parts.append(f"Found {literature_data['total_papers']} research papers discussing {protein}.")
        
        if literature_data.get("top_papers"):
            synthesis_parts.append(f"\nTop publications include:")
            for paper in literature_data["top_papers"][:3]:
                synthesis_parts.append(f"- {paper['title']} (PMID: {paper['pmid']}, {paper['year']})")
    
    # Drug binding section
    if analysis_type == "drug_binding":
        synthesis_parts.append(f"\n## Drug Binding Analysis")
        synthesis_parts.append(f"For drug discovery targeting {protein}, consider:")
        synthesis_parts.append("- Identifying binding pockets using structural analysis")
        synthesis_parts.append("- Reviewing literature for known inhibitors")
        synthesis_parts.append("- Analyzing conserved regions across species")
    
    # Recommendations
    synthesis_parts.append(f"\n## Recommendations")
    synthesis_parts.append("For further analysis, consider:")
    synthesis_parts.append("- Experimental validation of predicted structure")
    synthesis_parts.append("- Molecular dynamics simulations")
    synthesis_parts.append("- Comparison with homologous proteins")
    
    return "\n".join(synthesis_parts)