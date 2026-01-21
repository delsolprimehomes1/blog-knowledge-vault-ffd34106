import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  Zap,
  Radio,
  Lock,
  Mail,
  RefreshCw,
  Trash2,
  AlertCircle,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useSystemVerification, type VerificationResult } from "@/hooks/useSystemVerification";
import { format } from "date-fns";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
  { code: "fi", label: "Finnish", flag: "🇫🇮" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "sv", label: "Swedish", flag: "🇸🇪" },
  { code: "da", label: "Danish", flag: "🇩🇰" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺" },
];

export default function SystemVerification() {
  const {
    runFormLeadTest,
    runEmmaLeadTest,
    runClaimFlowTest,
    runRLSVerification,
    runHealthCheck,
    runAllTests,
    testResults,
    isRunning,
    healthStatus,
    clearResults,
  } = useSystemVerification();

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const handleRunTest = async (testName: string, testFn: () => Promise<unknown>) => {
    setRunningTest(testName);
    try {
      await testFn();
    } finally {
      setRunningTest(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            System Verification
          </h1>
          <p className="text-muted-foreground mt-1">
            Test and verify the complete CRM lead flow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearResults}
            disabled={testResults.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Results
          </Button>
          <Button
            onClick={() => handleRunTest("all", runAllTests)}
            disabled={isRunning}
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run All Tests
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quick-tests">
        <TabsList>
          <TabsTrigger value="quick-tests">Quick Tests</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-tests" className="space-y-4">
          {/* Language Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Test Language:</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tests Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Form Lead Test */}
            <QuickTestCard
              title="Form Lead Intake"
              description="Create a test lead from a form submission"
              icon={FileText}
              isRunning={runningTest === "form"}
              onRun={() => handleRunTest("form", () => runFormLeadTest(selectedLanguage))}
              lastResult={testResults.find((r) => r.testName.includes("Form Lead"))}
            />

            {/* Emma Lead Test */}
            <QuickTestCard
              title="Emma Chatbot Intake"
              description="Create a test lead from Emma AI conversation"
              icon={MessageSquare}
              isRunning={runningTest === "emma"}
              onRun={() => handleRunTest("emma", () => runEmmaLeadTest(selectedLanguage, 4))}
              lastResult={testResults.find((r) => r.testName.includes("Emma Lead"))}
            />

            {/* Claim Flow Test */}
            <QuickTestCard
              title="Lead Claim Flow"
              description="Test the complete claim process"
              icon={Zap}
              isRunning={runningTest === "claim"}
              onRun={() => handleRunTest("claim", runClaimFlowTest)}
              lastResult={testResults.find((r) => r.testName.includes("Claim Flow"))}
            />

            {/* RLS Test */}
            <QuickTestCard
              title="RLS Policy Check"
              description="Verify row-level security policies"
              icon={Lock}
              isRunning={runningTest === "rls"}
              onRun={() => handleRunTest("rls", runRLSVerification)}
              lastResult={testResults.find((r) => r.testName.includes("RLS"))}
            />
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => handleRunTest("health", runHealthCheck)}
              disabled={runningTest === "health"}
            >
              {runningTest === "health" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <HealthStatusCard
              title="Database"
              icon={Database}
              status={healthStatus?.database.status}
              message={healthStatus?.database.message}
            />
            <HealthStatusCard
              title="Edge Functions"
              icon={Zap}
              status={healthStatus?.edgeFunctions.status}
              message={healthStatus?.edgeFunctions.message}
            />
            <HealthStatusCard
              title="Realtime"
              icon={Radio}
              status={healthStatus?.realtime.status}
              message={healthStatus?.realtime.message}
            />
            <HealthStatusCard
              title="RLS Policies"
              icon={Lock}
              status={healthStatus?.rls.status}
              message={healthStatus?.rls.message}
            />
          </div>

          {!healthStatus && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Click "Refresh Status" to run health checks
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>
                Recent test runs and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No test results yet. Run some tests to see history.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {testResults.map((result, index) => (
                      <TestResultRow key={index} result={result} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Quick Test Card Component
function QuickTestCard({
  title,
  description,
  icon: Icon,
  isRunning,
  onRun,
  lastResult,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  isRunning: boolean;
  onRun: () => void;
  lastResult?: VerificationResult;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lastResult && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {lastResult.success ? "Passed" : "Failed"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {lastResult.duration}ms
              </span>
            </div>
            {lastResult.details.score && (
              <div className="text-xs text-muted-foreground">
                Score: {lastResult.details.score} | Segment: {lastResult.details.segment}
                {lastResult.details.agentsNotified !== undefined && (
                  <> | Agents: {lastResult.details.agentsNotified}</>
                )}
              </div>
            )}
            {lastResult.details.errors?.map((err, i) => (
              <div key={i} className="text-xs text-red-500 flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {err}
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={onRun}
          disabled={isRunning}
          className="w-full"
          variant={lastResult?.success === false ? "destructive" : "default"}
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isRunning ? "Running..." : "Run Test"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Health Status Card Component
function HealthStatusCard({
  title,
  icon: Icon,
  status,
  message,
}: {
  title: string;
  icon: React.ElementType;
  status?: string;
  message?: string;
}) {
  const getStatusColor = () => {
    if (!status) return "bg-muted text-muted-foreground";
    if (status === "healthy" || status === "enabled" || status === "configured") {
      return "bg-green-100 text-green-700";
    }
    if (status === "unknown" || status === "not_configured") {
      return "bg-yellow-100 text-yellow-700";
    }
    return "bg-red-100 text-red-700";
  };

  const getStatusIcon = () => {
    if (!status) return null;
    if (status === "healthy" || status === "enabled" || status === "configured") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (status === "unknown" || status === "not_configured") {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          {getStatusIcon()}
        </div>
        <h3 className="font-semibold">{title}</h3>
        {status && (
          <Badge variant="secondary" className={`mt-2 ${getStatusColor()}`}>
            {status.replace("_", " ")}
          </Badge>
        )}
        {message && (
          <p className="text-xs text-muted-foreground mt-2">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Test Result Row Component
function TestResultRow({ result }: { result: VerificationResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
        result.success ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <div>
            <p className="font-medium">{result.testName}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(result.timestamp), "MMM d, HH:mm:ss")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{result.testType}</Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {result.duration}ms
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t text-sm space-y-2">
          {result.details.leadId && (
            <p><strong>Lead ID:</strong> {result.details.leadId}</p>
          )}
          {result.details.score !== undefined && (
            <p><strong>Score:</strong> {result.details.score} | <strong>Segment:</strong> {result.details.segment}</p>
          )}
          {result.details.agentsNotified !== undefined && (
            <p><strong>Agents Notified:</strong> {result.details.agentsNotified}</p>
          )}
          {result.details.checks && (
            <div className="space-y-1">
              <strong>Checks:</strong>
              {result.details.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 ml-2">
                  {check.passed ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>{check.name}</span>
                  {check.message && (
                    <span className="text-muted-foreground">- {check.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {result.details.errors && result.details.errors.length > 0 && (
            <div className="text-red-600">
              <strong>Errors:</strong>
              <ul className="list-disc list-inside ml-2">
                {result.details.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
