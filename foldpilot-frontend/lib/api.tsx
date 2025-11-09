// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import { ProteinAnalysisResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export interface ProgressUpdate {
  step: string;
  message: string;
  data?: any;
}

/**
 * Analyze protein with real-time progress updates via Server-Sent Events
 */
export const analyzeProteinStreaming = async (
  query: string,
  onProgress?: (update: ProgressUpdate) => void
): Promise<ProteinAnalysisResult> => {
  return new Promise((resolve, reject) => {
    // Construct URL with query parameters
    const url = `${API_URL}/api/analyze/stream`;
    
    // Use fetch for SSE since EventSource doesn't support POST
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        include_binding_sites: true,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              
              try {
                const data = JSON.parse(dataStr);
                
                if (data.error) {
                  reject(new Error(data.error));
                  return;
                }
                
                if (data.complete) {
                  console.log('✅ Analysis complete, result:', data.result);
                  console.log('🎯 Binding sites in result:', data.result.binding_sites);
                  resolve(data.result as ProteinAnalysisResult);
                  return;
                }
                
                // Progress update
                if (data.step && onProgress) {
                  onProgress({
                    step: data.step,
                    message: data.message,
                  });
                }
              } catch (error) {
                console.error('Failed to parse SSE data:', error);
              }
            }
          }
        }
      })
      .catch((error) => {
        console.error('Streaming error:', error);
        reject(error);
      });
  });
};

/**
 * Fallback: Non-streaming analysis (for compatibility)
 */
export const analyzeProtein = async (query: string): Promise<ProteinAnalysisResult> => {
  try {
    console.log('📤 Sending request:', {
      query,
      include_binding_sites: true
    });

    const response = await apiClient.post<ProteinAnalysisResult>('/api/analyze', {
      query: query.trim(),
      include_binding_sites: true,
    });

    console.log('📥 Backend response:', response.data);
    console.log('🎯 Binding sites in response:', response.data.binding_sites);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail: string }>;
      console.error('❌ API Error:', axiosError.response?.data || axiosError.message);
      throw new Error(axiosError.response?.data?.detail || axiosError.message);
    }
    console.error('❌ Unknown error:', error);
    throw error;
  }
};

export default apiClient;