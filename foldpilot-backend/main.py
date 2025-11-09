# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import logging
from dotenv import load_dotenv
import os
import json
import asyncio

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
    include_binding_sites: Optional[bool] = True

class AnalysisResponse(BaseModel):
    protein: str
    uniprot_id: str
    organism: Optional[str] = "human"
    structure: Optional[str] = None
    structure_quality: Optional[dict] = None
    literature: Optional[dict] = None
    mutation_analysis: Optional[dict] = None
    binding_sites: Optional[dict] = None
    synthesis: str
    message: Optional[str] = None
    warnings: Optional[List[str]] = None

@app.get("/")
def root():
    return {
        "status": "FoldPilot API is running",
        "version": "1.0.0",
        "endpoints": ["/api/analyze", "/api/analyze/stream", "/api/structure/{uniprot_id}", "/health"]
    }

# Helper function to send SSE events
async def send_progress(step: str, message: str, data: dict = None):
    """Send a progress update via SSE"""
    event_data = {
        "step": step,
        "message": message,
        "timestamp": asyncio.get_event_loop().time()
    }
    if data:
        event_data["data"] = data
    
    return f"data: {json.dumps(event_data)}\n\n"

# @app.post("/api/analyze/stream")
# async def analyze_protein_stream(request: AnalysisRequest):
#     """
#     Streaming endpoint for real-time progress updates.
#     """
#     async def event_generator():
#         warnings = []
        
#         try:
#             # Import agents
#             from agents.planning_agent import extract_entities
#             from agents.structure_agent import get_protein_structure
#             from agents.literature_agent import search_literature
#             from agents.synthesis_agent import synthesize_results
            
#             # Check binding agent
#             binding_agent_available = False
#             try:
#                 from agents.binding_agent import find_binding_sites_simple
#                 binding_agent_available = True
#             except ImportError:
#                 warnings.append("Binding site analysis not available")
            
#             # Step 1: Planning
#             yield await send_progress("planning", "Understanding your query...")
#             await asyncio.sleep(0.1)
            
#             entities = extract_entities(request.query)
#             if entities.get("error"):
#                 yield f"data: {json.dumps({'error': entities['error']})}\n\n"
#                 return
            
#             if not entities.get("protein"):
#                 yield f"data: {json.dumps({'error': 'Could not identify protein'})}\n\n"
#                 return
            
#             entities["query"] = request.query

#             yield await send_progress("planning", f"Identified protein: {entities['protein']}", {"entities": entities})
            
#             # Step 2: Structure
#             yield await send_progress("structure", "Fetching protein structure...")
#             await asyncio.sleep(0.1)
            
#             structure_data = get_protein_structure(
#                 entities["protein"], 
#                 entities.get("organism", "human")
#             )
            
#             if not structure_data or not structure_data.get("uniprot_id"):
#                 warnings.append("Structure retrieval failed")
#                 structure_data = {
#                     "uniprot_id": "Unknown",
#                     "structure": None,
#                     "quality": None
#                 }
            
#             yield await send_progress("structure", "Structure retrieved", {
#                 "uniprot_id": structure_data.get("uniprot_id"),
#                 "quality": structure_data.get("quality")
#             })
            
#             # Step 2.5: Binding Sites
#             binding_sites = None
#             if request.include_binding_sites and binding_agent_available:
#                 yield await send_progress("binding", "Analyzing drug binding sites...")
#                 await asyncio.sleep(0.1)
                
#                 try:
#                     if structure_data.get("pdb_file"):
#                         binding_sites = find_binding_sites_simple(structure_data["pdb_file"])
                        
#                         if binding_sites.get("total_pockets", 0) == 0:
#                             warnings.append("No binding sites detected")
#                         else:
#                             yield await send_progress("binding", f"Found {binding_sites['total_pockets']} binding pockets")
#                     else:
#                         warnings.append("No structure file for binding analysis")
                        
#                 except Exception as e:
#                     logger.error(f"Binding site error: {e}")
#                     warnings.append(f"Binding analysis failed: {str(e)}")
            
#             # Step 3: Literature
#             yield await send_progress("literature", "Searching research papers...")
#             await asyncio.sleep(0.1)
            
#             literature_data = search_literature(
#                 entities["protein"],
#                 entities.get("mutation")
#             )
            
#             if literature_data and literature_data.get("total_papers", 0) > 0:
#                 yield await send_progress("literature", f"Found {literature_data['total_papers']} papers")
#             else:
#                 warnings.append("Literature search returned no results")
            
#             # Step 4: Synthesis
#             yield await send_progress("synthesis", "Generating AI analysis...")
#             await asyncio.sleep(0.1)
            
#             synthesis = synthesize_results(
#                 entities,
#                 structure_data,
#                 literature_data
#                 binding_sites
#             )
            
#             yield await send_progress("synthesis", "Analysis complete!")
            
#             # Send final result
#             response = AnalysisResponse(
#                 protein=entities["protein"],
#                 uniprot_id=structure_data.get("uniprot_id", "N/A"),
#                 organism=entities.get("organism", "human"),
#                 structure=structure_data.get("structure"),
#                 structure_quality=structure_data.get("quality"),
#                 literature=literature_data,
#                 binding_sites=binding_sites,
#                 synthesis=synthesis,
#                 warnings=warnings if warnings else None
#             )
            
#             yield f"data: {json.dumps({'complete': True, 'result': response.dict()})}\n\n"
            
#         except Exception as e:
#             logger.error(f"Stream error: {e}", exc_info=True)
#             yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
#     return StreamingResponse(
#         event_generator(),
#         media_type="text/event-stream",
#         headers={
#             "Cache-Control": "no-cache",
#             "X-Accel-Buffering": "no"
#         }
#     )


@app.post("/api/analyze/stream")
async def analyze_protein_stream(request: AnalysisRequest):
    """
    Streaming endpoint for real-time progress updates via Server-Sent Events.
    """
    async def event_generator():
        warnings = []
        
        try:
            # Import agents
            from agents.planning_agent import extract_entities
            from agents.structure_agent import get_protein_structure
            from agents.literature_agent import search_literature
            from agents.synthesis_agent import synthesize_results
            
            # Check binding agent
            binding_agent_available = False
            try:
                from agents.binding_agent import find_binding_sites_simple
                binding_agent_available = True
            except ImportError:
                warnings.append("Binding site analysis not available")
            
            # Helper to send progress with tool metadata
            def send_progress(step: str, message: str, tools: list = None, api: str = None):
                data = {
                    "step": step,
                    "message": message,
                }
                if tools:
                    data["tools"] = tools
                if api:
                    data["api"] = api
                return f"data: {json.dumps(data)}\n\n"
            
            # Step 1: Planning
            yield send_progress(
                "planning", 
                "Understanding your query...",
                tools=["NVIDIA Nemotron LLM", "Entity Extraction"],
                api="Nemotron API"
            )
            await asyncio.sleep(0.1)
            
            entities = extract_entities(request.query)
            if entities.get("error"):
                yield f"data: {json.dumps({'error': entities['error']})}\n\n"
                return
            
            if not entities.get("protein"):
                yield f"data: {json.dumps({'error': 'Could not identify protein'})}\n\n"
                return
            
            # Determine if binding sites should be analyzed
            should_analyze_binding = entities.get("should_analyze_binding_sites", False)
            
            # Build workflow plan
            workflow_steps = ["planning", "structure"]
            if should_analyze_binding:
                workflow_steps.append("binding")
            workflow_steps.extend(["literature", "synthesis"])
            
            yield send_progress(
                "planning", 
                f"Identified protein: {entities['protein']}" + 
                (f" - {'Will analyze binding sites' if should_analyze_binding else 'Skipping binding analysis (not relevant to query)'}"),
                tools=["NVIDIA Nemotron LLM", "UniProt Database"],
                api="Nemotron API + UniProt REST"
            )
            
            # Send workflow metadata
            yield f"data: {json.dumps({'workflow': {'steps': workflow_steps, 'include_binding': should_analyze_binding}})}\n\n"
            
            # Step 2: Structure
            yield send_progress(
                "structure", 
                "Fetching protein structure from AlphaFold...",
                tools=["UniProt API", "AlphaFold Database"],
                api="UniProt REST + AlphaFold EBI"
            )
            await asyncio.sleep(0.1)
            
            structure_data = get_protein_structure(
                entities["protein"], 
                entities.get("organism", "human")
            )
            
            if not structure_data or not structure_data.get("uniprot_id"):
                warnings.append("Structure retrieval failed")
                structure_data = {"uniprot_id": "Unknown", "structure": None, "quality": None}
            
            source = structure_data.get("source", "AlphaFold Database")
            yield send_progress(
                "structure", 
                f"Structure retrieved (UniProt: {structure_data.get('uniprot_id')})",
                tools=["AlphaFold Database", "PDB Parser"],
                api=source
            )
            
            # Step 3: Binding Sites (conditional)
            binding_sites = None
            if should_analyze_binding and request.include_binding_sites and binding_agent_available:
                yield send_progress(
                    "binding", 
                    "Analyzing drug binding sites...",
                    tools=["BioPython PDBParser", "Geometric Algorithms", "NeighborSearch"],
                    api="Local Computation"
                )
                await asyncio.sleep(0.1)
                
                try:
                    if structure_data.get("pdb_file"):
                        binding_sites = find_binding_sites_simple(structure_data["pdb_file"])
                        
                        if binding_sites.get("total_pockets", 0) == 0:
                            warnings.append("No binding sites detected")
                            yield send_progress(
                                "binding", 
                                "No binding pockets found",
                                tools=["BioPython PDBParser", "Geometric Algorithms"],
                                api="Local Computation"
                            )
                        else:
                            yield send_progress(
                                "binding", 
                                f"Found {binding_sites['total_pockets']} binding pockets!",
                                tools=["BioPython PDBParser", "Geometric Algorithms"],
                                api="Local Computation"
                            )
                    else:
                        warnings.append("No structure file for binding analysis")
                        yield send_progress(
                            "binding", 
                            "Structure unavailable for binding analysis",
                            tools=["BioPython PDBParser"],
                            api="Local Computation"
                        )
                        
                except Exception as e:
                    logger.error(f"Binding site error: {e}")
                    warnings.append(f"Binding analysis failed: {str(e)}")
                    yield send_progress(
                        "binding", 
                        "Binding analysis failed",
                        tools=["BioPython PDBParser"],
                        api="Local Computation"
                    )
            elif should_analyze_binding and not binding_agent_available:
                # Binding was requested but agent not available
                logger.info("Binding analysis requested but agent not available")
                warnings.append("Binding site analysis not available")
            elif not should_analyze_binding:
                # Binding analysis skipped by design (not relevant to query)
                logger.info("Skipping binding site analysis - not relevant to query")
                yield send_progress(
                    "binding", 
                    "Skipped - not relevant to query",
                    tools=[],
                    api="N/A"
                )
            
            # Step 4: Literature
            yield send_progress(
                "literature", 
                "Searching research papers on PubMed...",
                tools=["NCBI Entrez", "Europe PMC API"],
                api="PubMed API + Europe PMC REST"
            )
            await asyncio.sleep(0.1)
            
            literature_data = search_literature(
                entities["protein"],
                entities.get("mutation")
            )
            
            if literature_data and literature_data.get("total_papers", 0) > 0:
                source = literature_data.get("source", "PubMed")
                yield send_progress(
                    "literature", 
                    f"Found {literature_data['total_papers']} research papers",
                    tools=["NCBI Entrez", "Europe PMC API"],
                    api=source
                )
            else:
                warnings.append("Literature search returned no results")
                yield send_progress(
                    "literature", 
                    "No papers found",
                    tools=["NCBI Entrez", "Europe PMC API"],
                    api="PubMed API"
                )
            
            # Step 5: Synthesis
            yield send_progress(
                "synthesis", 
                "Generating AI analysis with NVIDIA Nemotron...",
                tools=["NVIDIA Nemotron LLM", "QA Agent"],
                api="Nemotron API"
            )
            await asyncio.sleep(0.1)
            
            synthesis = synthesize_results(entities, structure_data, literature_data, binding_sites)
            
            yield send_progress(
                "synthesis", 
                "Analysis complete!",
                tools=["NVIDIA Nemotron LLM", "QA Agent"],
                api="Nemotron API"
            )
            
            # Send final result
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
            
            # Send completion event
            yield f"data: {json.dumps({'complete': True, 'result': response.dict()})}\n\n"
            
        except Exception as e:
            logger.error(f"Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_protein(request: AnalysisRequest):
    """
    Standard non-streaming endpoint (for compatibility).
    """
    warnings = []
    
    try:
        logger.info(f"Received query: {request.query}")
        
        # Import agents
        from agents.planning_agent import extract_entities
        from agents.structure_agent import get_protein_structure
        from agents.literature_agent import search_literature
        from agents.synthesis_agent import synthesize_results
        
        # Check binding agent
        binding_agent_available = False
        try:
            from agents.binding_agent import find_binding_sites_simple
            binding_agent_available = True
        except ImportError:
            logger.warning("Binding agent not available")
            warnings.append("Binding site analysis not available in this version")
        
        # Step 1: Planning
        logger.info("Step 1: Planning - extracting entities")
        entities = extract_entities(request.query)
        if entities.get("error"):
            raise HTTPException(status_code=404, detail=entities["error"])
        
        if not entities.get("protein"):
            raise HTTPException(
                status_code=400, 
                detail="Could not identify protein in query"
            )
        entities["query"] = request.query 
        logger.info(f"Extracted entities: {entities}")
        
        # Determine if binding sites should be analyzed
        should_analyze_binding = entities.get("should_analyze_binding_sites", False)
        logger.info(f"Should analyze binding sites: {should_analyze_binding}")
        
        # Step 2: Structure
        logger.info(f"Step 2: Fetching structure for {entities['protein']}")
        structure_data = get_protein_structure(
            entities["protein"], 
            entities.get("organism", "human")
        )
        
        if not structure_data or not structure_data.get("uniprot_id"):
            warnings.append("Structure retrieval failed - some features limited")
            structure_data = {
                "uniprot_id": "Unknown",
                "structure": None,
                "quality": None
            }
        
        # Step 2.5: Binding Sites (conditional)
        binding_sites = None
        if should_analyze_binding and request.include_binding_sites and binding_agent_available:
            logger.info("Step 2.5: Analyzing binding sites")
            try:
                if structure_data.get("pdb_file"):
                    binding_sites = find_binding_sites_simple(structure_data["pdb_file"])
                    
                    if binding_sites.get("total_pockets", 0) == 0:
                        warnings.append("No binding sites detected")
                    else:
                        logger.info(f"✅ Found {binding_sites['total_pockets']} binding pockets")
                else:
                    warnings.append("Binding site analysis requires structure file")
                    
            except Exception as e:
                logger.error(f"Binding site analysis error: {e}", exc_info=True)
                warnings.append(f"Binding site analysis failed: {str(e)}")
        elif should_analyze_binding and not binding_agent_available:
            logger.info("Binding analysis requested but agent not available")
            warnings.append("Binding site analysis not available")
        elif not should_analyze_binding:
            logger.info("Skipping binding site analysis - not relevant to query")
        
        # Step 3: Literature
        logger.info("Step 3: Searching literature")
        literature_data = search_literature(
            entities["protein"],
            entities.get("mutation")
        )
        
        if not literature_data or literature_data.get("total_papers", 0) == 0:
            warnings.append("Literature search returned no results")
        
        # Step 4: Synthesis
        logger.info("Step 4: Synthesizing results")
        synthesis = synthesize_results(
            entities,
            structure_data,
            literature_data,
            binding_sites
        )
        
        # Build Response
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
        logger.info(f"Binding sites in response: {binding_sites is not None}")
        
        return response
        
    except HTTPException:
        raise
        
    except Exception as e:
        logger.error(f"❌ Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/structure/{uniprot_id}")
async def get_structure(uniprot_id: str):
    """Get structure data for a specific UniProt ID."""
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
    """Health check endpoint."""
    try:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)