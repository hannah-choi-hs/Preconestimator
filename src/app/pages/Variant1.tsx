import { useState, useEffect } from "react";
import { mockBids, aiInsights } from "../data/mockBids";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  FileText,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { analyzeBidsWithClaude } from "../services/bidAnalysis";

export function Variant1() {
  const [selectedBids, setSelectedBids] = useState([0, 1, 2]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCompletionColor = (completeness: number) => {
    if (completeness >= 90) return "text-green-600";
    if (completeness >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getCompletionBadge = (completeness: number) => {
    if (completeness >= 90) return "bg-green-100 text-green-800";
    if (completeness >= 75) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Get all unique categories
  const categories = Array.from(
    new Set(mockBids.flatMap((bid) => bid.lineItems.map((item) => item.category)))
  );

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
        throw new Error(result.error || "Analysis failed");
      }
    } catch (error: any) {
      console.log("Falling back to demo data");
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
        apex: { risk: "Low", changeOrderProbability: "0%", notes: "No data" },
        buildright: { risk: "Low", changeOrderProbability: "0%", notes: "No data" },
        titan: { risk: "Low", changeOrderProbability: "0%", notes: "No data" },
      },
      recommendations: claudeResponse.recommendations || [],
    };

    // Map completeness issues by contractor
    if (claudeResponse.completenessAnalysis?.issues) {
      claudeResponse.completenessAnalysis.issues.forEach((issue: any) => {
        const contractor = issue.contractor.toLowerCase();
        if (contractor.includes("apex")) {
          transformed.completenessAnalysis.apexIssues.push(issue);
        } else if (
          contractor.includes("buildright") ||
          contractor.includes("build right")
        ) {
          transformed.completenessAnalysis.buildrightIssues.push(issue);
        } else if (contractor.includes("titan")) {
          transformed.completenessAnalysis.titanIssues.push(issue);
        }
      });
    }

    // Map risk assessment by contractor
    if (claudeResponse.riskAssessment?.contractors) {
      claudeResponse.riskAssessment.contractors.forEach((contractor: any) => {
        const name = contractor.name.toLowerCase();
        if (name.includes("apex")) {
          transformed.riskAssessment.apex = {
            risk: contractor.risk,
            changeOrderProbability: contractor.changeOrderProbability,
            notes: contractor.notes,
          };
        } else if (
          name.includes("buildright") ||
          name.includes("build right")
        ) {
          transformed.riskAssessment.buildright = {
            risk: contractor.risk,
            changeOrderProbability: contractor.changeOrderProbability,
            notes: contractor.notes,
          };
        } else if (name.includes("titan")) {
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
    <div className="max-w-[1600px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Compare Subcontractor Bids Faster
        </h2>
        <p className="text-gray-600">
          Traditional detailed comparison view with comprehensive line-item analysis
        </p>
      </div>

      {/* AI Recommendation Banner */}
      <Alert className="border-blue-200 bg-blue-50">
        <Sparkles className="size-4 text-blue-600" />
        <AlertDescription className="text-sm">
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-blue-800">Analyzing bids with Claude AI...</span>
            </div>
          ) : analysisError ? (
            <div>
              <p className="font-medium text-orange-900 mb-1">
                {useMockData ? "Using Demo Data" : "Analysis Error"}
              </p>
              <p className="text-orange-800 text-xs">{analysisError}</p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-blue-900 mb-1">
                  AI Recommendation: {insights.overall.recommendation}
                </p>
                <p className="text-blue-800">{insights.overall.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className="bg-blue-600 text-white">
                  {insights.overall.confidence}% Confidence
                </Badge>
                {!useMockData && aiAnalysis && (
                  <Badge className="bg-green-600 text-white text-xs">
                    Powered by Claude
                  </Badge>
                )}
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Bid Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        {mockBids.map((bid, index) => (
          <Card key={bid.id} className="p-4 border-2 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{bid.contractor}</h3>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(bid.submittedDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getCompletionBadge(bid.completeness)}>
                  {bid.completeness}%
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(bid.totalAmount)}
                </p>
                <p className="text-sm text-gray-500">{bid.lineItems.length} line items</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {bid.completeness >= 90 ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <AlertCircle className="size-4 text-yellow-600" />
                )}
                <span className={getCompletionColor(bid.completeness)}>
                  {bid.completeness >= 90 ? "Complete" : "Needs Review"}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Line Item Comparison</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-48">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-64">
                      Description
                    </th>
                    {mockBids.map((bid) => (
                      <th
                        key={bid.id}
                        className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                      >
                        {bid.contractor.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((category) => {
                    const categoryItems = mockBids.map((bid) =>
                      bid.lineItems.filter((item) => item.category === category)
                    );

                    return categoryItems[0].map((_, itemIndex) => {
                      const descriptions = categoryItems.map((items) => items[itemIndex]);
                      if (!descriptions[0]) return null;

                      return (
                        <tr key={`${category}-${itemIndex}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {itemIndex === 0 ? category : ""}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {descriptions[0]?.description || ""}
                          </td>
                          {descriptions.map((item, bidIndex) => {
                            if (!item) {
                              return (
                                <td
                                  key={`${category}-${itemIndex}-${bidIndex}`}
                                  className="px-4 py-3 text-right"
                                >
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    Missing
                                  </Badge>
                                </td>
                              );
                            }

                            const prices = descriptions
                              .map((d) => d?.totalPrice)
                              .filter((p): p is number => p !== undefined);
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            const isLowest = item.totalPrice === minPrice && prices.length > 1;
                            const isHighest = item.totalPrice === maxPrice && prices.length > 1;

                            return (
                              <td
                                key={`${category}-${itemIndex}-${bidIndex}`}
                                className="px-4 py-3 text-right"
                              >
                                {item.isMissing || !item.totalPrice ? (
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                      Not Included
                                    </Badge>
                                    {item.notes && (
                                      <p className="text-xs text-gray-500">{item.notes}</p>
                                    )}
                                  </div>
                                ) : item.isIncomplete ? (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(item.totalPrice)}
                                    </p>
                                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                      Incomplete
                                    </Badge>
                                    {item.notes && (
                                      <p className="text-xs text-gray-500">{item.notes}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(item.totalPrice)}
                                    </span>
                                    {isLowest && (
                                      <TrendingDown className="size-4 text-green-600" />
                                    )}
                                    {isHighest && (
                                      <TrendingUp className="size-4 text-orange-600" />
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-gray-900">
                      Total Bid Amount
                    </td>
                    {mockBids.map((bid) => {
                      const lowestBid = Math.min(...mockBids.map((b) => b.totalAmount));
                      const isLowest = bid.totalAmount === lowestBid;
                      return (
                        <td key={bid.id} className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-gray-900">
                              {formatCurrency(bid.totalAmount)}
                            </span>
                            {isLowest && <TrendingDown className="size-5 text-green-600" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Price Analysis</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Lowest Bid</p>
                  <p className="text-lg font-semibold text-green-600">
                    {insights.priceAnalysis.lowestBid}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Market Alignment</p>
                  <p className="text-sm text-gray-600">
                    {insights.priceAnalysis.marketAlignment}
                  </p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Price Outliers</p>
                  {insights.priceAnalysis.outliers.map((outlier, index) => (
                    <div
                      key={index}
                      className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{outlier.category}</p>
                        <Badge variant="outline" className="text-yellow-700 border-yellow-700">
                          {outlier.variance}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{outlier.contractor}</p>
                      <p className="text-xs text-gray-600 mt-1">{outlier.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Completeness Issues</h3>
              </div>
              <div className="space-y-4">
                {[
                  { name: "Apex Construction", issues: insights.completenessAnalysis.apexIssues },
                  {
                    name: "BuildRight Solutions",
                    issues: insights.completenessAnalysis.buildrightIssues,
                  },
                  { name: "Titan Builders", issues: insights.completenessAnalysis.titanIssues },
                ].map((contractor, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">{contractor.name}</p>
                    {contractor.issues.map((issue, issueIdx) => {
                      const severityColor =
                        issue.severity === "critical"
                          ? "bg-red-100 border-red-300 text-red-800"
                          : issue.severity === "high"
                          ? "bg-orange-100 border-orange-300 text-orange-800"
                          : "bg-blue-100 border-blue-300 text-blue-800";

                      return (
                        <div
                          key={issueIdx}
                          className={`rounded-lg p-3 border ${severityColor}`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium">{issue.category}</p>
                            <Badge className={severityColor}>{issue.severity}</Badge>
                          </div>
                          <p className="text-xs mb-1">{issue.issue}</p>
                          <p className="text-xs font-medium">Impact: {issue.impact}</p>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">AI Recommendations</h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-green-600 mt-0.5" />
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "Apex Construction", data: insights.riskAssessment.apex },
              { name: "BuildRight Solutions", data: insights.riskAssessment.buildright },
              { name: "Titan Builders", data: insights.riskAssessment.titan },
            ].map((contractor, index) => {
              const riskColor =
                contractor.data.risk === "Low"
                  ? "border-green-200 bg-green-50"
                  : contractor.data.risk === "Medium"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-red-200 bg-red-50";

              return (
                <Card key={index} className={`p-6 ${riskColor}`}>
                  <h3 className="font-semibold text-gray-900 mb-4">{contractor.name}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Risk Level</p>
                      <p className="text-xl font-bold text-gray-900">{contractor.data.risk}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Change Order Probability</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {contractor.data.changeOrderProbability}
                      </p>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-700">{contractor.data.notes}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              Based on risk analysis, Apex Construction Group and Titan Builders LLC show the
              lowest risk profiles with change order probabilities under 15%.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline">Export Analysis</Button>
        <Button variant="outline">Share Report</Button>
        <Button className="bg-blue-600 hover:bg-blue-700">Submit to Owner</Button>
      </div>
    </div>
  );
}