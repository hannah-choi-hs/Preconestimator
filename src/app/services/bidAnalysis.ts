import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface AnalysisResponse {
  success: boolean;
  analysis: {
    overall: {
      recommendation: string;
      confidence: number;
      summary: string;
    };
    priceAnalysis: {
      lowestBid: string;
      marketAlignment: string;
      outliers: Array<{
        category: string;
        contractor: string;
        variance: string;
        explanation: string;
      }>;
    };
    completenessAnalysis: {
      issues: Array<{
        contractor: string;
        severity: 'low' | 'high' | 'critical';
        category: string;
        issue: string;
        impact: string;
      }>;
    };
    riskAssessment: {
      contractors: Array<{
        name: string;
        risk: 'Low' | 'Medium' | 'High';
        changeOrderProbability: string;
        notes: string;
      }>;
    };
    recommendations: string[];
  };
  analysisId?: string;
  error?: string;
}

export async function analyzeBidsWithClaude(bids: any[]): Promise<AnalysisResponse> {
  try {
    console.log('Starting bid analysis request...');
    console.log('Project ID:', projectId);
    console.log('Number of bids:', bids.length);
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-23453da7/analyze-bids`;
    console.log('Request URL:', url);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ bids }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully received analysis data');
    return data;
  } catch (error: any) {
    console.log('Bid analysis API unavailable - using demo data instead');
    
    // Check if it's a network/timeout error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Using demo data: Edge Function not deployed. Deploy to enable live AI analysis.');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Using demo data: Request timeout. The server may not be responding.');
    }
    
    throw error;
  }
}