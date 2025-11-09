# agents/literature_agent.py

import logging
import time
import requests
from typing import Optional, Dict, List
from Bio import Entrez

logger = logging.getLogger(__name__)

# IMPORTANT: Set your email for NCBI (required for API access)
Entrez.email = "your.email@example.com"  # Replace with your actual email
Entrez.api_key = None  # Optional: Get free API key from NCBI for higher rate limits

def search_literature(protein: str, mutation: str = None) -> Dict:
    """
    Search literature with robust retry logic and fallback.
    
    Args:
        protein: Protein name or gene symbol
        mutation: Optional mutation (e.g., "R273H")
    
    Returns:
        Dictionary with papers, key findings, and metadata
    """
    logger.info(f"Searching literature for: {protein}" + (f" with mutation {mutation}" if mutation else ""))
    
    # Try NCBI PubMed first (with retries)
    result = _search_ncbi_with_retry(protein, mutation, max_retries=5)
    
    if result and result["total_papers"] > 0:
        return result
    
    # Fallback to Europe PMC if NCBI fails
    logger.warning("NCBI PubMed failed - trying Europe PMC fallback")
    europe_result = _search_europe_pmc(protein, mutation)
    
    if europe_result and europe_result["total_papers"] > 0:
        return europe_result
    
    # Both failed - return error state with helpful message
    logger.error("All literature search methods failed")
    return {
        "total_papers": 0,
        "key_findings": "Literature search temporarily unavailable. This is a known NCBI/Europe PMC issue. Please try again in a few minutes.",
        "top_papers": [],
        "status": "error"
    }


def _search_ncbi_with_retry(protein: str, mutation: Optional[str], max_retries: int = 5) -> Optional[Dict]:
    """
    Search NCBI PubMed with exponential backoff retry logic.
    """
    base_delay = 2  # Start with 2 seconds
    
    # Build search query
    query = f"{protein}[Title/Abstract]"
    if mutation:
        query += f" AND {mutation}[Title/Abstract]"
    
    logger.info(f"Searching PubMed for: {query}")
    
    for attempt in range(max_retries):
        try:
            # Search for paper IDs
            handle = Entrez.esearch(
                db="pubmed",
                term=query,
                retmax=20,
                sort="relevance",
                usehistory="y"
            )
            search_results = Entrez.read(handle)
            handle.close()
            
            id_list = search_results.get("IdList", [])
            
            if not id_list:
                logger.warning(f"No papers found for query: {query}")
                return {
                    "total_papers": 0,
                    "key_findings": f"No papers found for {protein}",
                    "top_papers": []
                }
            
            logger.info(f"Found {len(id_list)} papers")
            
            # Fetch details for top papers (limit to 5 for speed)
            papers = _fetch_paper_details(id_list[:5])
            
            # Success!
            return {
                "total_papers": len(id_list),
                "key_findings": f"Found {len(id_list)} papers about {protein}" + (f" and {mutation}" if mutation else ""),
                "top_papers": papers,
                "status": "success",
                "source": "PubMed"
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_msg}")
            
            # Check if it's a temporary backend error
            is_backend_error = any(phrase in error_msg for phrase in [
                "Backend failed",
                "Database is not supported",
                "Couldn't resolve",
                "address table is empty"
            ])
            
            if is_backend_error and attempt < max_retries - 1:
                # Exponential backoff: 2s, 4s, 8s, 16s, 32s
                delay = base_delay * (2 ** attempt)
                logger.info(f"NCBI backend issue detected - retrying in {delay}s...")
                time.sleep(delay)
                continue
            
            # If it's not a backend error or last attempt, fail
            if attempt == max_retries - 1:
                logger.error(f"Literature search error: {error_msg}")
                return None
    
    return None


def _fetch_paper_details(id_list: List[str]) -> List[Dict]:
    """
    Fetch detailed information for a list of PubMed IDs.
    """
    if not id_list:
        return []
    
    try:
        # Fetch paper details
        handle = Entrez.efetch(
            db="pubmed",
            id=",".join(id_list),
            rettype="medline",
            retmode="xml"
        )
        records = Entrez.read(handle)
        handle.close()
        
        papers = []
        for record in records.get("PubmedArticle", []):
            try:
                article = record["MedlineCitation"]["Article"]
                
                # Extract paper information
                paper = {
                    "pmid": str(record["MedlineCitation"]["PMID"]),
                    "title": article.get("ArticleTitle", "No title"),
                    "year": _extract_year(article),
                    "abstract": _extract_abstract(article)
                }
                papers.append(paper)
            except Exception as e:
                logger.warning(f"Failed to parse paper: {e}")
                continue
        
        return papers
        
    except Exception as e:
        logger.error(f"Failed to fetch paper details: {e}")
        return []


def _extract_year(article: Dict) -> int:
    """Extract publication year from article data."""
    try:
        journal = article.get("Journal", {})
        pub_date = journal.get("JournalIssue", {}).get("PubDate", {})
        
        # Try different date fields
        year = pub_date.get("Year")
        if year:
            return int(year)
        
        # Fallback to MedlineDate
        medline_date = pub_date.get("MedlineDate", "")
        if medline_date:
            return int(medline_date[:4])
        
        return 2024  # Default fallback
    except:
        return 2024


def _extract_abstract(article: Dict) -> str:
    """Extract abstract text from article data."""
    try:
        abstract = article.get("Abstract", {})
        abstract_texts = abstract.get("AbstractText", [])
        
        if isinstance(abstract_texts, list):
            return " ".join(str(text) for text in abstract_texts)
        else:
            return str(abstract_texts)
    except:
        return ""


def _search_europe_pmc(protein: str, mutation: Optional[str]) -> Optional[Dict]:
    """
    Fallback literature search using Europe PMC API.
    """
    try:
        logger.info(f"Searching Europe PMC for: {protein}")
        
        # Build query
        query = protein
        if mutation:
            query += f" AND {mutation}"
        
        url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
        params = {
            "query": query,
            "format": "json",
            "pageSize": 20,
            "sort": "CITED"  # Sort by citation count
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        results = data.get("resultList", {}).get("result", [])
        
        if not results:
            logger.warning(f"No papers found in Europe PMC for: {query}")
            return None
        
        # Parse papers
        papers = []
        for result in results[:5]:
            paper = {
                "pmid": result.get("pmid", result.get("id", "N/A")),
                "title": result.get("title", "No title"),
                "year": int(result.get("pubYear", 2024)),
                "abstract": result.get("abstractText", "")[:500]  # Truncate long abstracts
            }
            papers.append(paper)
        
        logger.info(f"Found {len(results)} papers in Europe PMC")
        
        return {
            "total_papers": data.get("hitCount", len(results)),
            "key_findings": f"Found {len(results)} papers about {protein} (via Europe PMC)" + (f" and {mutation}" if mutation else ""),
            "top_papers": papers,
            "status": "success",
            "source": "Europe PMC"
        }
        
    except Exception as e:
        logger.error(f"Europe PMC search failed: {e}")
        return None


# Optional: Pre-cache common proteins for demo
CACHED_LITERATURE = {
    "TP53": {
        "total_papers": 30000,
        "key_findings": "TP53 is the most frequently mutated gene in human cancers",
        "top_papers": [
            {
                "pmid": "36766853",
                "title": "The Role of TP53 in Adaptation and Evolution",
                "year": 2023,
                "abstract": "TP53 is a major tumor suppressor gene..."
            }
            # Add more cached papers as needed
        ],
        "status": "cached"
    }
    # Add more proteins for your demo
}

def get_cached_or_search(protein: str, mutation: Optional[str] = None) -> Dict:
    """
    Check cache first, then search if not found.
    Useful for demos to avoid API failures.
    """
    cache_key = f"{protein}_{mutation}" if mutation else protein
    
    if cache_key in CACHED_LITERATURE:
        logger.info(f"Using cached literature for {cache_key}")
        return CACHED_LITERATURE[cache_key]
    
    return search_literature(protein, mutation)
