import { useState, useEffect } from "react";
import { mockBids, aiInsights } from "../data/mockBids";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { analyzeBidsWithClaude } from "../services/bidAnalysis";

export function Variant2() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBids, setSelectedBids] = useState<number[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const steps = [
    { name: "Select Bids", description: "Choose 2-3 bids to compare" },
    { name: "Quick Review", description: "Overview of selected bids" },
    { name: "AI Analysis", description: "Powered by Claude AI" },
    { name: "Recommendation", description: "Final decision support" },
  ];

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const toggleBidSelection = (index: number) => {
    if (selectedBids.includes(index)) {
      setSelectedBids(selectedBids.filter((i) => i !== index));
    } else if (selectedBids.length < 3) {
      setSelectedBids([...selectedBids, index]);
    }
  };

  const getStepProgress = () => ((currentStep + 1) / steps.length) * 100;

  // Trigger AI analysis when moving to step 2 (AI Analysis)
  useEffect(() => {
    if (currentStep === 2 && !aiAnalysis && !isAnalyzing && !useMockData) {
      performAnalysis();
    }
  }, [currentStep]);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const selectedBidData = selectedBids.map(index => mockBids[index]);
      const result = await analyzeBidsWithClaude(selectedBidData);
      
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Progress Steps */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center size-10 rounded-full border-2 font-semibold ${
                  index <= currentStep
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{step.name}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="size-5 text-gray-300 mx-2 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
        <Progress value={getStepProgress()} className="h-2" />
      </div>

      {/* Step 0: Select Bids */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Select Bids to Compare</h2>
            <p className="text-gray-600">Choose 2-3 subcontractor bids for AI-powered analysis</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {mockBids.map((bid, index) => {
              const isSelected = selectedBids.includes(index);
              return (
                <Card
                  key={bid.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? "ring-2 ring-blue-600 border-blue-600" : ""
                  }`}
                  onClick={() => toggleBidSelection(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {bid.contractor}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Submitted: {new Date(bid.submittedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <CheckCircle2 className="size-6 text-blue-600" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(bid.totalAmount)}
                          </p>
                        </div>
                        <div className="h-12 w-px bg-gray-200" />
                        <div>
                          <p className="text-sm text-gray-600">Completeness</p>
                          <div className="flex items-center gap-2">
                            <Progress value={bid.completeness} className="w-24 h-2" />
                            <span className="font-semibold text-gray-900">
                              {bid.completeness}%
                            </span>
                          </div>
                        </div>
                        <div className="h-12 w-px bg-gray-200" />
                        <div>
                          <p className="text-sm text-gray-600">Line Items</p>
                          <p className="font-semibold text-gray-900">{bid.lineItems.length}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {bid.completeness >= 90 ? (
                          <Badge className="bg-green-100 text-green-800">Complete</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">Needs Review</Badge>
                        )}
                        {bid.lineItems.some((item) => item.isMissing) && (
                          <Badge className="bg-red-100 text-red-800">Missing Items</Badge>
                        )}
                        {bid.lineItems.some((item) => item.isIncomplete) && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Incomplete Items
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {selectedBids.length > 0 && selectedBids.length < 2 && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="size-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                Please select at least 2 bids to continue with the comparison.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Step 1: Quick Review */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Quick Review</h2>
            <p className="text-gray-600">Overview of your selected bids</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {selectedBids.map((bidIndex) => {
              const bid = mockBids[bidIndex];
              const lowestBid = Math.min(...selectedBids.map((i) => mockBids[i].totalAmount));
              const isLowest = bid.totalAmount === lowestBid;
              const missingCount = bid.lineItems.filter((item) => item.isMissing).length;
              const incompleteCount = bid.lineItems.filter((item) => item.isIncomplete).length;

              return (
                <Card key={bid.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{bid.contractor}</h3>
                    {isLowest && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                        <TrendingDown className="size-3" />
                        Lowest Bid
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(bid.totalAmount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Completeness</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          {bid.completeness}%
                        </span>
                        {bid.completeness >= 90 ? (
                          <CheckCircle2 className="size-5 text-green-600" />
                        ) : (
                          <AlertCircle className="size-5 text-yellow-600" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Missing Items</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">{missingCount}</span>
                        {missingCount > 0 && <XCircle className="size-5 text-red-600" />}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Incomplete</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          {incompleteCount}
                        </span>
                        {incompleteCount > 0 && <AlertCircle className="size-5 text-orange-600" />}
                      </div>
                    </div>
                  </div>

                  {(missingCount > 0 || incompleteCount > 0) && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-sm font-medium text-gray-700">Issues Found:</p>
                      {bid.lineItems
                        .filter((item) => item.isMissing || item.isIncomplete)
                        .slice(0, 3)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <AlertCircle className="size-4 text-orange-600 mt-0.5" />
                            <div>
                              <span className="font-medium">{item.category}:</span>{" "}
                              {item.description}
                              {item.notes && (
                                <span className="text-gray-500"> - {item.notes}</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Sparkles className="size-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              AI analysis will identify scope gaps, price anomalies, and risk factors based on
              your historical project data.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step 2: AI Analysis */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="size-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">AI-Powered Analysis</h2>
            </div>
            <p className="text-gray-600">Insights based on your historical bidding data</p>
            {useMockData && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Using Demo Data
              </Badge>
            )}
            {aiAnalysis && !useMockData && (
              <Badge className="bg-green-600 text-white">
                Powered by Claude AI
              </Badge>
            )}
          </div>

          {isAnalyzing && (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-12 animate-spin text-blue-600" />
                <div className="text-center">
                  <p className="font-medium text-gray-900">Analyzing bids with Claude AI...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
                </div>
              </div>
            </Card>
          )}

          {analysisError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">
                <p className="font-medium mb-1">Unable to Connect to Analysis Server</p>
                <p className="mb-2">{analysisError}</p>
                <p className="text-xs mt-2 pt-2 border-t border-red-200">
                  <strong>Note:</strong> The Supabase Edge Function needs to be deployed to enable live AI analysis. For now, showing demo data to demonstrate the UI flow.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!isAnalyzing && (
            <div className="grid grid-cols-2 gap-4">
              {/* Price Analysis */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="size-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Price Analysis</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Lowest Bid</p>
                    <p className="text-xl font-bold text-green-700">
                      {insights.priceAnalysis.lowestBid}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Market Alignment</p>
                    <p className="text-sm text-gray-600">
                      {insights.priceAnalysis.marketAlignment}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Risk Assessment */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Risk Factors</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Apex", data: insights.riskAssessment.apex },
                    { name: "BuildRight", data: insights.riskAssessment.buildright },
                    { name: "Titan", data: insights.riskAssessment.titan },
                  ].map((contractor, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 ${
                        contractor.data.risk === "Low"
                          ? "bg-green-50 border border-green-200"
                          : contractor.data.risk === "Medium"
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">{contractor.name}</p>
                        <Badge
                          className={
                            contractor.data.risk === "Low"
                              ? "bg-green-600 text-white"
                              : contractor.data.risk === "Medium"
                              ? "bg-yellow-600 text-white"
                              : "bg-red-600 text-white"
                          }
                        >
                          {contractor.data.risk} Risk
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Change Order Probability: {contractor.data.changeOrderProbability}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Completeness Issues */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Completeness Issues by Contractor</h3>
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
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{contractor.name}</p>
                    <Badge
                      className={
                        contractor.issues.length === 0
                          ? "bg-green-100 text-green-800"
                          : contractor.issues.some((i) => i.severity === "critical" || i.severity === "high")
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {contractor.issues.length} issues
                    </Badge>
                  </div>
                  {contractor.issues.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        No significant issues found
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contractor.issues.map((issue, issueIdx) => (
                        <div
                          key={issueIdx}
                          className={`rounded-lg p-3 border ${
                            issue.severity === "critical"
                              ? "bg-red-50 border-red-200"
                              : issue.severity === "high"
                              ? "bg-orange-50 border-orange-200"
                              : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900">{issue.category}</p>
                            <Badge
                              variant="outline"
                              className={
                                issue.severity === "critical"
                                  ? "border-red-600 text-red-700"
                                  : issue.severity === "high"
                                  ? "border-orange-600 text-orange-700"
                                  : "border-blue-600 text-blue-700"
                              }
                            >
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700 mb-1">{issue.issue}</p>
                          <p className="text-xs font-medium text-gray-900">
                            Impact: {issue.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Price Outliers */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Price Outliers</h3>
            <div className="space-y-2">
              {insights.priceAnalysis.outliers.map((outlier, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{outlier.category}</p>
                      <p className="text-sm text-gray-700">{outlier.contractor}</p>
                    </div>
                    <Badge className="bg-yellow-600 text-white">{outlier.variance}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{outlier.explanation}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Step 3: Recommendation */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <FileCheck className="size-6 text-green-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Final Recommendation</h2>
            </div>
            <p className="text-gray-600">AI-powered decision support for your bid selection</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {selectedBids.map((bidIndex) => {
              const bid = mockBids[bidIndex];
              const isRecommended =
                bid.contractor === insights.overall.recommendation;
              return (
                <Card
                  key={bid.id}
                  className={`p-4 ${
                    isRecommended ? "ring-2 ring-green-600 border-green-600" : ""
                  }`}
                >
                  <div className="space-y-2">
                    {isRecommended && (
                      <Badge className="bg-green-600 text-white mb-2">Recommended</Badge>
                    )}
                    <h4 className="font-semibold text-gray-900">{bid.contractor}</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(bid.totalAmount)}
                    </p>
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Completeness:</span>
                        <span className="font-semibold text-gray-900">
                          {bid.completeness}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Risk:</span>
                        <span className="font-semibold text-gray-900">
                          {bid.contractor.includes("Apex")
                            ? insights.riskAssessment.apex.risk
                            : bid.contractor.includes("BuildRight")
                            ? insights.riskAssessment.buildright.risk
                            : insights.riskAssessment.titan.risk}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Alert className="border-green-200 bg-green-50 p-4 w-full">
            <div className="grid grid-cols-[2fr_1fr_3fr] gap-4 items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-green-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-green-900">Recommended Contractor: </span>
                  <span className="font-bold text-green-900">{insights.overall.recommendation}</span>
                </div>
              </div>
              <div>
                <Badge className="bg-green-600 text-white px-2 py-1">
                  {insights.overall.confidence}% Confidence
                </Badge>
              </div>
              <div className="text-green-800 text-[13px] text-left w-[700%] px-0">{insights.overall.summary}</div>
            </div>
          </Alert>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Next Steps</h3>
            <ul className="space-y-3">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex items-center justify-center size-6 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-gray-700 flex-1">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === 0 && selectedBids.length < 2}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue
            <ArrowRight className="size-4 ml-2" />
          </Button>
        ) : (
          <Button className="bg-green-600 hover:bg-green-700">
            <FileCheck className="size-4 mr-2" />
            Submit to Owner
          </Button>
        )}
      </div>
    </div>
  );
}