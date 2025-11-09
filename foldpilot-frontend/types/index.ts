export interface AnalysisQuery {
    query: string;
}

export interface BindingSite {
    pocket_id: number;
    volume: number;
    center: number[];
    num_residues: number;
    residues: number[];
    residue_names: string[];
    score: number;
    confidence: string;
    description: string;
}

export interface BindingSiteAnalysis {
    total_pockets: number;
    top_pockets: BindingSite[];
    method: string;
    note?: string;
    error?: string;
}

export interface ProteinAnalysisResult {
    protein: string;
    uniprot_id: string;
    organism?: string;
    structure?: string;
    structure_quality?: {
        avg_plddt: number;
        confidence: string;
        num_residues: number;
    };
    literature?: {
        total_papers: number;
        key_findings: string;
        top_papers: Paper[];
    };
    mutation_analysis?: MutationAnalysis;
    binding_sites?: BindingSiteAnalysis; // ✅ Updated type
    synthesis: string;
    message?: string;
    warnings?: string[];
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