export interface AnalysisQuery {
    query: string;
  }
  
  export interface ProteinAnalysisResult {
    protein: string;
    uniprot_id: string;
    organism?: string;
    structure?: string;
    structure_quality?: {
      avg_plddt: number;
      confidence: string;
    };
    literature?: {
      total_papers: number;
      key_findings: string;
      top_papers: Paper[];
    };
    mutation_analysis?: MutationAnalysis;
    binding_sites?: BindingSite[];
    synthesis: string;
    message?: string;
  }
  
  export interface Paper {
    pmid: string;
    title: string;
    year: number;
    abstract?: string;
  }
  
  export interface MutationAnalysis {
    mutation: string;
    prediction: 'STABILIZING' | 'DESTABILIZING' | 'NEUTRAL' | 'UNCERTAIN';
    confidence: string;
    reasoning: string;
    literature_support?: string;
  }
  
  export interface BindingSite {
    id: number;
    volume: number;
    druggability_score?: number;
    residues: number[];
    location: string;
  }
  
  export interface AgentStep {
    name: string;
    description: string;
    status: 'pending' | 'active' | 'complete' | 'error';
  }