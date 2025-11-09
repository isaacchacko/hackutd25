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

export const analyzeProtein = async (query: string): Promise<ProteinAnalysisResult> => {
  try {
    const response = await apiClient.post<ProteinAnalysisResult>('/api/analyze', {
      query,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail: string }>;
      throw new Error(axiosError.response?.data?.detail || axiosError.message);
    }
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