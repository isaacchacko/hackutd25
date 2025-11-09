# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FoldPilot AI API", version="1.0.0")

# CORS - allow Next.js to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class AnalysisRequest(BaseModel):
    query: str
    include_binding_sites: Optional[bool] = False  # Optional feature flag

class AnalysisResponse(BaseModel):
    protein: str
    uniprot_id: str
    organism: Optional[str] = "human"
    structure: Optional[str] = None
    structure_quality: Optional[dict] = None
    literature: Optional[dict] = None
    mutation_analysis: Optional[dict] = None
    binding_sites: Optional[dict] = None  # Changed from list to dict
    synthesis: str
    message: Optional[str] = None
    warnings: Optional[List[str]] = None  # Track issues

@app.get("/")
def root():
    return {
        "status": "FoldPilot API is running",
        "version": "1.0.0",
        "endpoints": ["/api/analyze", "/api/structure/{uniprot_id}", "/health"]
    }

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_protein(request: AnalysisRequest):
    """
    Main endpoint for protein analysis with multi-agent orchestration.
    
    Example queries:
    - "Analyze human p53"
    - "Find drug targets in COVID spike protein"
    - "What does the R273H mutation do to p53?"
    """
    warnings = []
    
    try:
        logger.info(f"Received query: {request.query}")
        
        # Import agents
        from agents.planning_agent import extract_entities
        from agents.structure_agent import get_protein_structure
        from agents.literature_agent import search_literature
        from agents.synthesis_agent import synthesize_results
        
           # Optional: Import binding agent if available
        binding_agent_available = False
        try:
            from agents.binding_agent import find_binding_sites_simple
            binding_agent_available = True
        except ImportError:
            logger.warning("Binding agent not available - skipping binding site analysis")
            warnings.append("Binding site analysis not available in this version")
        
        # ========================================
        # Step 1: Planning - Extract Entities
        # ========================================
        logger.info("Step 1: Planning - extracting entities")
        entities = extract_entities(request.query)
        
        if not entities.get("protein"):
            raise HTTPException(
                status_code=400, 
                detail="Could not identify protein in query. Please specify a protein name or UniProt ID."
            )
        
        logger.info(f"Extracted entities: {entities}")
        
        # ========================================
        # Step 2: Structure Retrieval
        # ========================================
        logger.info(f"Step 2: Fetching structure for {entities['protein']}")
        structure_data = get_protein_structure(
            entities["protein"], 
            entities.get("organism", "human")
        )
        
        # Check if structure retrieval failed
        if not structure_data or not structure_data.get("uniprot_id"):
            warnings.append("Structure retrieval failed - some features limited")
            structure_data = {
                "uniprot_id": "Unknown",
                "structure": None,
                "quality": None
            }
        
        # Validate structure quality data format
        if structure_data.get("quality"):
            logger.info(f"Structure quality: {structure_data['quality']}")
        else:
            warnings.append("Structure quality information unavailable")
        
        # ========================================
        # Step 2.5: Binding Site Analysis (Optional)
        # ========================================
        binding_sites = None
        if request.include_binding_sites and binding_agent_available:
            logger.info("Step 2.5: Analyzing binding sites")
            try:
                # Check if we have structure data
                if structure_data.get("pdb_file"):
                    binding_sites = find_binding_sites_simple(structure_data["pdb_file"])
                    
                    if binding_sites.get("total_pockets", 0) == 0:
                        warnings.append("No binding sites detected - this is expected for some structures")
                else:
                    warnings.append("Binding site analysis requires downloaded structure file")
                    binding_sites = None
                    
            except Exception as e:
                logger.error(f"Binding site analysis error: {e}", exc_info=True)
                warnings.append(f"Binding site analysis failed: {str(e)}")
                binding_sites = None
        
        # ========================================
        # Step 3: Literature Search
        # ========================================
        logger.info("Step 3: Searching literature")
        literature_data = search_literature(
            entities["protein"],
            entities.get("mutation")
        )
        
        # Check literature search status
        if not literature_data or literature_data.get("total_papers", 0) == 0:
            warnings.append("Literature search returned no results - data may be incomplete")
        
        if literature_data and literature_data.get("status") == "error":
            warnings.append("Literature search experienced intermittent issues - results may be partial")
        
        # ========================================
        # Step 4: Synthesis
        # ========================================
        logger.info("Step 4: Synthesizing results")
        
        # Add warnings to synthesis context
        synthesis_context = {
            "entities": entities,
            "structure": structure_data,
            "literature": literature_data,
            "binding_sites": binding_sites,
            "warnings": warnings
        }
        
        # synthesis = synthesize_results(
        #     entities=entities,
        #     structure=structure_data,
        #     literature=literature_data,
        #     binding_sites=binding_sites
        # )
        synthesis = synthesize_results(
            entities,          # ✅ Positional arg
            structure_data,    # ✅ Positional arg
            literature_data    # ✅ Positional arg
        )
        
        # ========================================
        # Build Response
        # ========================================
        response = AnalysisResponse(
            protein=entities["protein"],
            uniprot_id=structure_data.get("uniprot_id", "N/A"),
            organism=entities.get("organism", "human"),
            structure=structure_data.get("structure"),
            structure_quality=structure_data.get("quality"),
            literature=literature_data,
            binding_sites=binding_sites,
            synthesis=synthesis,
            warnings=warnings if warnings else None
        )
        
        logger.info("✅ Analysis complete!")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
        
    except Exception as e:
        logger.error(f"❌ Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Analysis failed: {str(e)}"
        )

@app.get("/api/structure/{uniprot_id}")
async def get_structure(uniprot_id: str):
    """
    Get structure data for a specific UniProt ID.
    """
    try:
        from agents.structure_agent import get_protein_structure
        
        structure_data = get_protein_structure(
            protein_name=uniprot_id,
            organism="human"
        )
        
        if not structure_data:
            raise HTTPException(
                status_code=404,
                detail=f"Structure not found for {uniprot_id}"
            )
        
        return structure_data
        
    except Exception as e:
        logger.error(f"Structure retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    """
    Health check endpoint for monitoring.
    """
    try:
        # Test that agents can be imported
        from agents import planning_agent, structure_agent, literature_agent, synthesis_agent
        
        return {
            "status": "healthy",
            "agents": {
                "planning": True,
                "structure": True,
                "literature": True,
                "synthesis": True
            }
        }
    except ImportError as e:
        return {
            "status": "degraded",
            "error": f"Agent import failed: {str(e)}"
        }

@app.get("/api/capabilities")
def get_capabilities():
    """
    Return available features and agent capabilities.
    """
    capabilities = {
        "planning_agent": True,
        "structure_agent": True,
        "literature_agent": True,
        "synthesis_agent": True,
        "binding_agent": False,
        "mutation_agent": False
    }
    
    # Check optional agents
    try:
        from agents.binding_agent import find_binding_sites_simple
        capabilities["binding_agent"] = True
    except ImportError:
        pass
    
    return {
        "version": "1.0.0",
        "capabilities": capabilities,
        "supported_organisms": ["human", "mouse", "yeast"],
        "supported_queries": [
            "general_analysis",
            "mutation_analysis",
            "drug_binding",
            "literature_review"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
