// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import { AnalysisQuery, ProteinAnalysisResult, Paper } from '@/types'; // Add Paper here

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for protein analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Analyze a protein based on a natural language query
 * @param query - Natural language query about the protein
 * @returns Promise<ProteinAnalysisResult>
 */
export const analyzeProtein = async (query: string): Promise<ProteinAnalysisResult> => {
  try {
    console.log('Sending request to backend:', {
      query,
      include_binding_sites: true
    });

    const response = await apiClient.post<ProteinAnalysisResult>('/api/analyze', {
      query: query.trim(),
      include_binding_sites: true, // ✅ Always include binding sites
    });

    console.log('Backend response:', response.data);

    // Verify binding_sites is in the response
    if (response.data.binding_sites) {
      console.log('✅ Binding sites received:', response.data.binding_sites.total_pockets, 'pockets');
    } else {
      console.warn('⚠️ No binding sites in response');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail: string }>;
      console.error('API Error:', axiosError.response?.data || axiosError.message);
      throw new Error(axiosError.response?.data?.detail || axiosError.message);
    }
    console.error('Unknown error:', error);
    throw error;
  }
};

export const getStructure = async (uniprotId: string): Promise<string> => {
  const response = await apiClient.get<{ structure: string }>(`/api/structure/${uniprotId}`);
  return response.data.structure;
};

export const searchPubmed = async (protein: string, mutation?: string): Promise<Paper[]> => {
  const response = await apiClient.post<{ papers: Paper[] }>('/api/literature/search', {
    protein,
    mutation,
  });
  return response.data.papers;
};