# Precon Analyzer

A tool for General Contractor estimators to compare subcontractor bids faster and smarter during preconstruction.

## The Problem

Bid leveling is one of the most time-consuming parts of preconstruction. Estimators receive bids from multiple subcontractors, each formatted differently, with missing line items, incomplete pricing, and inconsistent scope coverage. Manually reviewing these side by side — spotting the gaps, flagging outliers, and making a defensible recommendation — can take hours.

## What It Does

Precon Analyzer lets estimators load multiple subcontractor bids and get an instant, structured comparison. The app:

- Displays all bids side by side in a line-item comparison table, highlighting the lowest price per line and flagging missing or incomplete items
- Runs an AI analysis via Claude that evaluates price outliers, bid completeness, change order risk, and market alignment
- Surfaces a ranked recommendation with a confidence score and reasoning
- Shows per-contractor risk profiles including estimated change order probability and notes
- Falls back gracefully to curated demo data if the backend is unavailable

The tool is built around three layout variants that explore different ways to present the same bid data — useful for evaluating which UX approach works best for estimators in practice.

## How It Works

1. Bid data is loaded (currently from mock data representing a real commercial project scenario with three contractors)
2. On load, the frontend calls a Supabase Edge Function that sends the bid data to the Claude API
3. Claude analyzes the bids as a construction expert and returns structured JSON covering price analysis, completeness issues, risk assessment, and actionable recommendations
4. The UI maps Claude's response into the appropriate sections and displays it alongside the raw bid comparison

If the Edge Function is unreachable or times out, the app falls back to a pre-built set of AI insights so the comparison view is always usable.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v7 |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| Icons | Lucide React |
| Charts | Recharts |
| Backend | Supabase Edge Functions (Deno + Hono) |
| AI | Claude API (Anthropic) |
| Persistence | Supabase KV store |
| Styling | Tailwind CSS v4 |

## Running Locally

Install dependencies:

```bash
npm i
```

Start the development server:

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default. It will work with demo data out of the box. To enable live AI analysis, deploy the Supabase Edge Function and set the `CLAUDE_API_KEY` environment variable in your Supabase project settings.

## Project Structure

```
src/
  app/
    data/         # Mock bid data and fallback AI insights
    pages/        # Three layout variants (Variant1, Variant2, Variant3)
    services/     # Claude API integration
    components/   # Shared UI components
supabase/
  functions/
    server/       # Edge Function: bid analysis endpoint + KV store
```
