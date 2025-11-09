# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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

class AnalysisResponse(BaseModel):
    protein: str
    uniprot_id: str
    organism: Optional[str] = "human"
    structure: Optional[str] = None
    structure_quality: Optional[dict] = None
    literature: Optional[dict] = None
    mutation_analysis: Optional[dict] = None
    binding_sites: Optional[list] = None
    synthesis: str
    message: Optional[str] = None

@app.get("/")
def root():
    return {
        "status": "FoldPilot API is running",
        "version": "1.0.0",
        "endpoints": ["/api/analyze", "/api/structure/{uniprot_id}"]
    }

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_protein(request: AnalysisRequest):
    """
    Main endpoint for protein analysis
    """
    try:
        logger.info(f"Received query: {request.query}")
        
        # Import agents
        from agents.planning_agent import extract_entities
        from agents.structure_agent import get_protein_structure
        from agents.literature_agent import search_literature
        from agents.synthesis_agent import synthesize_results
        
        # Step 1: Extract entities from query
        logger.info("Step 1: Planning - extracting entities")
        entities = extract_entities(request.query)
        
        if not entities.get("protein"):
            raise HTTPException(status_code=400, detail="Could not identify protein in query")
        
        # Step 2: Get structure
        logger.info(f"Step 2: Fetching structure for {entities['protein']}")
        structure_data = get_protein_structure(
            entities["protein"], 
            entities.get("organism", "human")
        )
        
        # Step 3: Search literature
        logger.info("Step 3: Searching literature")
        literature_data = search_literature(
            entities["protein"],
            entities.get("mutation")
        )
        
        # Step 4: Synthesize results
        logger.info("Step 4: Synthesizing results")
        synthesis = synthesize_results(entities, structure_data, literature_data)
        
        # Build response - INCLUDE structure_quality
        response = AnalysisResponse(
            protein=entities["protein"],
            uniprot_id=structure_data.get("uniprot_id", "N/A"),
            organism=entities.get("organism", "human"),
            structure=structure_data.get("structure"),  # Add this
            structure_quality=structure_data.get("quality"),  # This should now work
            literature=literature_data,
            synthesis=synthesis
        )
        
        logger.info("Analysis complete!")
        return response
        
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)