import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-23453da7/health", (c) => {
  return c.json({ status: "ok" });
});

// Bid analysis endpoint using Claude API
app.post("/make-server-23453da7/analyze-bids", async (c) => {
  try {
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    
    if (!claudeApiKey) {
      console.log("Error: CLAUDE_API_KEY environment variable not set");
      return c.json({ error: "Claude API key not configured. Please add your API key in the environment settings." }, 500);
    }
    
    console.log(`Using Claude API key: ${claudeApiKey.substring(0, 20)}...`);

    const body = await c.req.json();
    const { bids } = body;

    if (!bids || !Array.isArray(bids)) {
      console.log("Error: Invalid request - bids array missing");
      return c.json({ error: "Invalid request. Please provide bids array." }, 400);
    }

    console.log(`Analyzing ${bids.length} bids with Claude API - using model: claude-3-opus-20240229`);

    // Prepare the prompt for Claude
    const prompt = `You are a construction bid analysis expert helping a General Contractor estimator evaluate subcontractor bids. 

Analyze the following ${bids.length} bids and provide comprehensive insights:

${bids.map((bid: any, index: number) => `
BID ${index + 1}: ${bid.contractor}
- Submitted: ${bid.submittedDate}
- Total Amount: $${bid.totalAmount.toLocaleString()}
- Completeness: ${bid.completeness}%
- Line Items (${bid.lineItems.length} total):
${bid.lineItems.slice(0, 15).map((item: any) => 
  `  * ${item.category} - ${item.description}: ${item.totalPrice ? '$' + item.totalPrice.toLocaleString() : 'MISSING'} ${item.isMissing ? '[NOT INCLUDED]' : ''} ${item.isIncomplete ? '[INCOMPLETE: ' + item.notes + ']' : ''}`
).join('\n')}
${bid.lineItems.length > 15 ? `  ... and ${bid.lineItems.length - 15} more items` : ''}
`).join('\n---\n')}

Please provide a JSON response with the following structure:
{
  "overall": {
    "recommendation": "Contractor name to recommend",
    "confidence": number (0-100),
    "summary": "Brief explanation of recommendation"
  },
  "priceAnalysis": {
    "lowestBid": "Contractor name with lowest bid",
    "marketAlignment": "Analysis of pricing vs market rates",
    "outliers": [
      {
        "category": "Category name",
        "contractor": "Contractor name",
        "variance": "percentage or description",
        "explanation": "Why this is an outlier"
      }
    ]
  },
  "completenessAnalysis": {
    "issues": [
      {
        "contractor": "Contractor name",
        "severity": "low|high|critical",
        "category": "Category",
        "issue": "Brief description",
        "impact": "Estimated impact"
      }
    ]
  },
  "riskAssessment": {
    "contractors": [
      {
        "name": "Contractor name",
        "risk": "Low|Medium|High",
        "changeOrderProbability": "percentage",
        "notes": "Risk explanation"
      }
    ]
  },
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3",
    "Actionable recommendation 4"
  ]
}

Focus on:
1. Identifying missing or incomplete scope items
2. Price outliers and market alignment
3. Risk of change orders
4. Completeness and quality of each bid`;

    // Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Claude API error: ${response.status} - ${errorText}`);
      return c.json({ error: `Claude API error: ${response.status} - ${errorText}` }, response.status);
    }

    const data = await response.json();
    console.log("Claude API response received successfully");

    // Extract the text content from Claude's response
    const analysisText = data.content[0].text;
    
    // Parse the JSON from Claude's response
    let analysis;
    try {
      // Try to extract JSON from the response (Claude sometimes wraps it in markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(analysisText);
      }
    } catch (parseError) {
      console.log(`Error parsing Claude response: ${parseError}`);
      console.log(`Raw response: ${analysisText}`);
      return c.json({ error: "Failed to parse AI analysis", rawResponse: analysisText }, 500);
    }

    // Store the analysis in KV store for potential future reference
    const analysisId = `analysis-${Date.now()}`;
    await kv.set(analysisId, {
      timestamp: new Date().toISOString(),
      bidCount: bids.length,
      analysis: analysis,
    });

    return c.json({
      success: true,
      analysis: analysis,
      analysisId: analysisId,
    });

  } catch (error) {
    console.log(`Error in bid analysis endpoint: ${error}`);
    return c.json({ error: `Server error during bid analysis: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);