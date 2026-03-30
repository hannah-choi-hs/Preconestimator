import { useState, useEffect } from "react";
import { mockBids, aiInsights } from "../data/mockBids";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Target,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { analyzeBidsWithClaude } from "../services/bidAnalysis";

export function Variant3() {
  const [selectedMetric, setSelectedMetric] = useState<"price" | "completeness" | "risk">(
    "price"
  );
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const priceComparisonData = mockBids.map((bid) => ({
    name: bid.contractor.split(" ")[0],
    amount: bid.totalAmount,
    completeness: bid.completeness,
  }));

  const categoryComparisonData = Array.from(
    new Set(mockBids.flatMap((bid) => bid.lineItems.map((item) => item.category)))
  ).map((category, index) => {
    const data: any = { category: category };
    mockBids.forEach((bid) => {
      const categoryTotal = bid.lineItems
        .filter((item) => item.category === category && item.totalPrice)
        .reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      data[bid.contractor.split(" ")[0]] = categoryTotal;
    });
    return data;
  });

  const radarData = [
    {
      metric: "Price",
      Apex: 85,
      BuildRight: 95,
      Titan: 78,
    },
    {
      metric: "Completeness",
      Apex: 92,
      BuildRight: 78,
      Titan: 95,
    },
    {
      metric: "Risk",
      Apex: 88,
      BuildRight: 32,
      Titan: 92,
    },
    {
      metric: "Timeline",
      Apex: 85,
      BuildRight: 75,
      Titan: 90,
    },
    {
      metric: "Experience",
      Apex: 90,
      BuildRight: 80,
      Titan: 95,
    },
  ];

  const riskDistributionData = [
    { name: "Low Risk", value: 2, color: "#22c55e" },
    { name: "High Risk", value: 1, color: "#ef4444" },
  ];

  const issuesSeverityData = [
    { severity: "Low", count: 2, color: "#3b82f6" },
    { severity: "High", count: 3, color: "#f97316" },
    { severity: "Critical", count: 1, color: "#ef4444" },
  ];

  const lowestBid = Math.min(...mockBids.map((b) => b.totalAmount));
  const highestBid = Math.max(...mockBids.map((b) => b.totalAmount));
  const avgCompleteness =
    mockBids.reduce((sum, b) => sum + b.completeness, 0) / mockBids.length;
  const totalIssues = [
    ...aiInsights.completenessAnalysis.apexIssues,
    ...aiInsights.completenessAnalysis.buildrightIssues,
    ...aiInsights.completenessAnalysis.titanIssues,
  ].length;

  // Trigger AI analysis when component mounts
  useEffect(() => {
    if (!aiAnalysis && !isAnalyzing) {
      performAnalysis();
    }
  }, []);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const result = await analyzeBidsWithClaude(mockBids);
      
      if (result.success) {
        // Transform Claude's response to match our expected format
        const transformedAnalysis = transformClaudeResponse(result.analysis);
        setAiAnalysis(transformedAnalysis);
        setUseMockData(false);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.log('Falling back to demo data');
      setAnalysisError(error.message);
      // Fall back to mock data if API fails
      setUseMockData(true);
      setAiAnalysis(aiInsights);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Transform Claude's response to match our expected format
  const transformClaudeResponse = (claudeResponse: any) => {
    // If it's already in the right format, return it
    if (claudeResponse.riskAssessment?.apex) {
      return claudeResponse;
    }

    // Transform from Claude's array format to our keyed format
    const transformed: any = {
      overall: claudeResponse.overall,
      priceAnalysis: claudeResponse.priceAnalysis,
      completenessAnalysis: {
        apexIssues: [],
        buildrightIssues: [],
        titanIssues: [],
      },
      riskAssessment: {
        apex: { risk: 'Low', changeOrderProbability: '0%', notes: 'No data' },
        buildright: { risk: 'Low', changeOrderProbability: '0%', notes: 'No data' },
        titan: { risk: 'Low', changeOrderProbability: '0%', notes: 'No data' },
      },
      recommendations: claudeResponse.recommendations || [],
    };

    // Map completeness issues by contractor
    if (claudeResponse.completenessAnalysis?.issues) {
      claudeResponse.completenessAnalysis.issues.forEach((issue: any) => {
        const contractor = issue.contractor.toLowerCase();
        if (contractor.includes('apex')) {
          transformed.completenessAnalysis.apexIssues.push(issue);
        } else if (contractor.includes('buildright') || contractor.includes('build right')) {
          transformed.completenessAnalysis.buildrightIssues.push(issue);
        } else if (contractor.includes('titan')) {
          transformed.completenessAnalysis.titanIssues.push(issue);
        }
      });
    }

    // Map risk assessment by contractor
    if (claudeResponse.riskAssessment?.contractors) {
      claudeResponse.riskAssessment.contractors.forEach((contractor: any) => {
        const name = contractor.name.toLowerCase();
        if (name.includes('apex')) {
          transformed.riskAssessment.apex = {
            risk: contractor.risk,
            changeOrderProbability: contractor.changeOrderProbability,
            notes: contractor.notes,
          };
        } else if (name.includes('buildright') || name.includes('build right')) {
          transformed.riskAssessment.buildright = {
            risk: contractor.risk,
            changeOrderProbability: contractor.changeOrderProbability,
            notes: contractor.notes,
          };
        } else if (name.includes('titan')) {
          transformed.riskAssessment.titan = {
            risk: contractor.risk,
            changeOrderProbability: contractor.changeOrderProbability,
            notes: contractor.notes,
          };
        }
      });
    }

    return transformed;
  };

  // Use either real AI analysis or mock data
  const insights = aiAnalysis || aiInsights;

  return (
    <div className="max-w-[1800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Bid Analysis Dashboard</h2>
          <p className="text-gray-600">
            Visual analytics and insights for comprehensive bid evaluation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="size-4" />
            Export Report
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Target className="size-4" />
            Submit Decision
          </Button>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <Alert className="border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <Sparkles className="size-6 text-green-600 mt-1" />
          {isAnalyzing ? (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-green-600" />
                <h3 className="font-semibold text-green-900 text-lg">Analyzing bids with Claude AI...</h3>
              </div>
              <p className="text-green-800 text-sm mt-2">This may take a few seconds</p>
            </div>
          ) : (
            <div className="flex-1 flex gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-900 text-lg">AI Recommendation</h3>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-green-600 text-white text-base px-3 py-1">
                      {insights.overall.confidence}% Confidence
                    </Badge>
                    {!useMockData && aiAnalysis && (
                      <Badge className="bg-blue-600 text-white text-xs">
                        Powered by Claude
                      </Badge>
                    )}
                    {useMockData && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                        Demo Data
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xl font-bold text-green-900 mb-2">
                  {insights.overall.recommendation}
                </p>
              </div>
              <div className="flex-1 flex items-center">
                <p className="text-green-800 text-sm w-full">{insights.overall.summary}</p>
              </div>
            </div>
          )}
        </div>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Lowest Bid</p>
            <TrendingDown className="size-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(lowestBid)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {mockBids.find((b) => b.totalAmount === lowestBid)?.contractor}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Highest Bid</p>
            <TrendingUp className="size-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(highestBid)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {mockBids.find((b) => b.totalAmount === highestBid)?.contractor}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Completeness</p>
            <CheckCircle2 className="size-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgCompleteness.toFixed(0)}%</p>
          <p className="text-sm text-gray-500 mt-1">Across all bids</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Issues</p>
            <AlertTriangle className="size-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalIssues}</p>
          <p className="text-sm text-gray-500 mt-1">Flagged by AI</p>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Price Comparison */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="size-5 text-blue-600" />
            Total Bid Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priceComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) =>
                  `$${(value / 1000000).toFixed(1)}M`
                }
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ borderRadius: "8px" }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Completeness & Risk Radar */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="size-5 text-purple-600" />
            Multi-Factor Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Apex"
                dataKey="Apex"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Radar
                name="BuildRight"
                dataKey="BuildRight"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.3}
              />
              <Radar
                name="Titan"
                dataKey="Titan"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="size-5 text-green-600" />
          Price by Category Comparison
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={categoryComparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="category" 
              angle={-45}
              textAnchor="end"
              height={100}
              tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
            />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
            <Tooltip
              formatter={(value: any) => formatCurrency(value)}
              contentStyle={{ borderRadius: "8px" }}
            />
            <Legend />
            <Bar dataKey="Apex" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="BuildRight" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Titan" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Risk & Issues Analysis */}
      <div className="grid grid-cols-3 gap-4">
        {/* Risk Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`risk-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Issues by Severity */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Issues by Severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={issuesSeverityData}>
              <XAxis dataKey="severity" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: "8px" }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {issuesSeverityData.map((entry, index) => (
                  <Cell key={`severity-cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Completeness Score */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Completeness Score</h3>
          <div className="space-y-4 mt-6">
            {mockBids.map((bid) => (
              <div key={bid.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{bid.contractor.split(" ")[0]}</span>
                  <span className="font-semibold text-gray-900">{bid.completeness}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      bid.completeness >= 90
                        ? "bg-green-600"
                        : bid.completeness >= 75
                        ? "bg-yellow-600"
                        : "bg-red-600"
                    }`}
                    style={{ width: `${bid.completeness}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Contractor Cards */}
      <div className="grid grid-cols-3 gap-4">
        {mockBids.map((bid, index) => {
          const isRecommended = bid.contractor === aiAnalysis?.overall.recommendation;
          const isLowest = bid.totalAmount === lowestBid;
          const riskData =
            bid.contractor.includes("Apex")
              ? aiAnalysis?.riskAssessment.apex
              : bid.contractor.includes("BuildRight")
              ? aiAnalysis?.riskAssessment.buildright
              : aiAnalysis?.riskAssessment.titan;

          const issues =
            bid.contractor.includes("Apex")
              ? aiAnalysis?.completenessAnalysis.apexIssues
              : bid.contractor.includes("BuildRight")
              ? aiAnalysis?.completenessAnalysis.buildrightIssues
              : aiAnalysis?.completenessAnalysis.titanIssues;

          return (
            <Card
              key={bid.id}
              className={`p-6 ${
                isRecommended ? "ring-2 ring-green-600 border-green-600" : ""
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{bid.contractor}</h3>
                  {isRecommended && (
                    <Badge className="bg-green-600 text-white">Recommended</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(bid.totalAmount)}
                    </p>
                    {isLowest && <TrendingDown className="size-5 text-green-600" />}
                  </div>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(bid.submittedDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completeness</span>
                    <Badge
                      className={
                        bid.completeness >= 90
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {bid.completeness}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Risk Level</span>
                    <Badge
                      className={
                        riskData?.risk === "Low"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {riskData?.risk}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Change Order Risk</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {riskData?.changeOrderProbability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Issues Found</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {issues?.length}
                    </span>
                  </div>
                </div>

                {issues?.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Top Issues:</p>
                    <div className="space-y-1">
                      {issues.slice(0, 2).map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <AlertTriangle className="size-3 text-orange-600 mt-0.5" />
                          <span>{issue.issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* AI Recommendations */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-blue-600" />
          AI-Powered Recommendations
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {aiAnalysis?.recommendations.map((rec, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white font-semibold text-sm">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700 flex-1">{rec}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}