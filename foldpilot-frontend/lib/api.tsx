// src/lib/api.ts
import axios, { AxiosError } from 'axios';
import { ProteinAnalysisResult } from '@/types';

// Normalize API URL - remove trailing slash to avoid double slashes
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

const API_URL = getApiUrl();

// Always log API URL to help debug (both development and production)
if (typeof window !== 'undefined') {
  console.log('🔗 API URL configured:', API_URL);
  console.log('🔗 Environment variable NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET (using default)');
}

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
  tools?: string[];
  api?: string;
  data?: any;
}

export interface WorkflowMetadata {
  steps: string[];
  include_binding: boolean;
}

/**
 * Analyze protein with real-time progress updates via Server-Sent Events
 */
export const analyzeProteinStreaming = async (
  query: string,
  onProgress?: (update: ProgressUpdate) => void
): Promise<ProteinAnalysisResult> => {
  return new Promise((resolve, reject) => {
    // Construct URL with query parameters - ensure no double slashes
    const url = `${API_URL}/api/analyze/stream`;
    
    console.log('📡 Streaming request to:', url);
    
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
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`❌ HTTP error! status: ${response.status}, URL: ${url}`, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
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
                
                // Workflow metadata
                if (data.workflow && onProgress) {
                  onProgress({
                    step: 'workflow',
                    message: '',
                    data: data.workflow,
                  });
                }
                
                // Progress update
                if (data.step && onProgress) {
                  onProgress({
                    step: data.step,
                    message: data.message,
                    tools: data.tools,
                    api: data.api,
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
        console.error('❌ Streaming error:', error);
        console.error('Failed URL:', url);
        reject(error);
      });
  });
};

/**
 * Fallback: Non-streaming analysis (for compatibility)
 */
export const analyzeProtein = async (query: string): Promise<ProteinAnalysisResult> => {
  try {
    console.log('📤 Sending request to:', `${API_URL}/api/analyze`);
    console.log('📤 Request data:', {
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
      console.error('❌ API Error:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        url: axiosError.config?.url,
        baseURL: axiosError.config?.baseURL,
        message: axiosError.message
      });
      throw new Error(axiosError.response?.data?.detail || axiosError.message);
    }
    console.error('❌ Unknown error:', error);
    throw error;
  }
};

export default apiClient;