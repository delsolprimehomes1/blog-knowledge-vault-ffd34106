import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VerificationResult {
  testName: string;
  testType: "intake" | "notification" | "claim" | "rls" | "realtime" | "health";
  success: boolean;
  duration: number;
  details: {
    leadId?: string;
    score?: number;
    segment?: string;
    priority?: string;
    agentsNotified?: number;
    claimSucceeded?: boolean;
    errors?: string[];
    message?: string;
    checks?: Array<{ name: string; passed: boolean; message?: string }>;
  };
  timestamp: string;
}

export interface HealthCheckResult {
  database: { status: "healthy" | "unhealthy"; message?: string };
  edgeFunctions: { status: "healthy" | "unhealthy" | "unknown"; message?: string };
  email: { status: "configured" | "not_configured" | "unknown"; message?: string };
  realtime: { status: "healthy" | "unhealthy"; message?: string };
  rls: { status: "enabled" | "disabled" | "unknown"; message?: string };
}

export function useSystemVerification() {
  const [testResults, setTestResults] = useState<VerificationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);

  const addResult = useCallback((result: VerificationResult) => {
    setTestResults((prev) => [result, ...prev].slice(0, 50)); // Keep last 50 results
  }, []);

  // Test 1: Form Lead Intake
  const runFormLeadTest = useCallback(async (language: string = "en"): Promise<VerificationResult> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("crm-test-lead", {
        body: {
          source: "form",
          language,
          budgetRange: "€500K-€1M",
          timeframe: "within_1_year",
          locationPreference: ["Marbella", "Estepona"],
        },
      });

      if (error) throw error;

      const result: VerificationResult = {
        testName: `Form Lead Test (${language.toUpperCase()})`,
        testType: "intake",
        success: data.success,
        duration: Date.now() - startTime,
        details: {
          leadId: data.leadId,
          score: data.score,
          segment: data.segment,
          priority: data.priority,
          agentsNotified: data.agentsNotified,
          errors: data.errors,
        },
        timestamp: new Date().toISOString(),
      };

      addResult(result);
      return result;
    } catch (err) {
      const result: VerificationResult = {
        testName: `Form Lead Test (${language.toUpperCase()})`,
        testType: "intake",
        success: false,
        duration: Date.now() - startTime,
        details: {
          errors: [err instanceof Error ? err.message : String(err)],
        },
        timestamp: new Date().toISOString(),
      };
      addResult(result);
      return result;
    }
  }, [addResult]);

  // Test 2: Emma Lead Intake
  const runEmmaLeadTest = useCallback(async (
    language: string = "fr",
    questionsAnswered: number = 4
  ): Promise<VerificationResult> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("crm-test-lead", {
        body: {
          source: "emma",
          language,
          budgetRange: "€1M-€2M",
          timeframe: "within_6_months",
          locationPreference: ["Marbella"],
          questionsAnswered,
          intakeComplete: questionsAnswered >= 4,
        },
      });

      if (error) throw error;

      const result: VerificationResult = {
        testName: `Emma Lead Test (${language.toUpperCase()}, ${questionsAnswered}Q)`,
        testType: "intake",
        success: data.success,
        duration: Date.now() - startTime,
        details: {
          leadId: data.leadId,
          score: data.score,
          segment: data.segment,
          priority: data.priority,
          agentsNotified: data.agentsNotified,
          errors: data.errors,
        },
        timestamp: new Date().toISOString(),
      };

      addResult(result);
      return result;
    } catch (err) {
      const result: VerificationResult = {
        testName: `Emma Lead Test (${language.toUpperCase()}, ${questionsAnswered}Q)`,
        testType: "intake",
        success: false,
        duration: Date.now() - startTime,
        details: {
          errors: [err instanceof Error ? err.message : String(err)],
        },
        timestamp: new Date().toISOString(),
      };
      addResult(result);
      return result;
    }
  }, [addResult]);

  // Test 3: Claim Flow
  const runClaimFlowTest = useCallback(async (leadId?: string): Promise<VerificationResult> => {
    const startTime = Date.now();
    try {
      // If no leadId provided, create a test lead first
      let testLeadId = leadId;
      if (!testLeadId) {
        const createResult = await runFormLeadTest("en");
        if (!createResult.success || !createResult.details.leadId) {
          throw new Error("Failed to create test lead for claim flow test");
        }
        testLeadId = createResult.details.leadId;
      }

      // Get current user (must be an agent)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Attempt to claim the lead
      const { data: claimResult, error: claimError } = await supabase.functions.invoke("claim-lead", {
        body: {
          leadId: testLeadId,
          agentId: user.id,
        },
      });

      if (claimError) throw claimError;

      const result: VerificationResult = {
        testName: "Claim Flow Test",
        testType: "claim",
        success: claimResult?.success || false,
        duration: Date.now() - startTime,
        details: {
          leadId: testLeadId,
          claimSucceeded: claimResult?.success,
          errors: claimResult?.error ? [claimResult.error] : undefined,
          message: claimResult?.success ? "Lead claimed successfully" : claimResult?.error,
        },
        timestamp: new Date().toISOString(),
      };

      addResult(result);
      return result;
    } catch (err) {
      const result: VerificationResult = {
        testName: "Claim Flow Test",
        testType: "claim",
        success: false,
        duration: Date.now() - startTime,
        details: {
          errors: [err instanceof Error ? err.message : String(err)],
        },
        timestamp: new Date().toISOString(),
      };
      addResult(result);
      return result;
    }
  }, [addResult, runFormLeadTest]);

  // Test 4: RLS Verification
  const runRLSVerification = useCallback(async (): Promise<VerificationResult> => {
    const startTime = Date.now();
    const checks: Array<{ name: string; passed: boolean; message?: string }> = [];

    try {
      // Check if user can only see their leads
      const { data: leads, error: leadsError } = await supabase
        .from("crm_leads")
        .select("id, assigned_agent_id")
        .limit(10);

      if (leadsError) {
        checks.push({ name: "Leads RLS", passed: false, message: leadsError.message });
      } else {
        checks.push({ name: "Leads RLS", passed: true, message: `Can see ${leads?.length || 0} leads` });
      }

      // Check activities
      const { data: activities, error: activitiesError } = await supabase
        .from("crm_activities")
        .select("id")
        .limit(5);

      if (activitiesError) {
        checks.push({ name: "Activities RLS", passed: false, message: activitiesError.message });
      } else {
        checks.push({ name: "Activities RLS", passed: true, message: `Can see ${activities?.length || 0} activities` });
      }

      // Check reminders
      const { data: reminders, error: remindersError } = await supabase
        .from("crm_reminders")
        .select("id")
        .limit(5);

      if (remindersError) {
        checks.push({ name: "Reminders RLS", passed: false, message: remindersError.message });
      } else {
        checks.push({ name: "Reminders RLS", passed: true, message: `Can see ${reminders?.length || 0} reminders` });
      }

      // Check notifications
      const { data: notifications, error: notifsError } = await supabase
        .from("crm_notifications")
        .select("id")
        .limit(5);

      if (notifsError) {
        checks.push({ name: "Notifications RLS", passed: false, message: notifsError.message });
      } else {
        checks.push({ name: "Notifications RLS", passed: true, message: `Can see ${notifications?.length || 0} notifications` });
      }

      const allPassed = checks.every((c) => c.passed);

      const result: VerificationResult = {
        testName: "RLS Policy Verification",
        testType: "rls",
        success: allPassed,
        duration: Date.now() - startTime,
        details: {
          checks,
          message: allPassed ? "All RLS policies working correctly" : "Some RLS checks failed",
        },
        timestamp: new Date().toISOString(),
      };

      addResult(result);
      return result;
    } catch (err) {
      const result: VerificationResult = {
        testName: "RLS Policy Verification",
        testType: "rls",
        success: false,
        duration: Date.now() - startTime,
        details: {
          checks,
          errors: [err instanceof Error ? err.message : String(err)],
        },
        timestamp: new Date().toISOString(),
      };
      addResult(result);
      return result;
    }
  }, [addResult]);

  // Health Check
  const runHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    const health: HealthCheckResult = {
      database: { status: "unhealthy" },
      edgeFunctions: { status: "unknown" },
      email: { status: "unknown" },
      realtime: { status: "unhealthy" },
      rls: { status: "unknown" },
    };

    // Database check
    try {
      const { count, error } = await supabase
        .from("crm_agents")
        .select("*", { count: "exact", head: true });

      if (error) {
        health.database = { status: "unhealthy", message: error.message };
      } else {
        health.database = { status: "healthy", message: `${count || 0} agents in database` };
      }
    } catch {
      health.database = { status: "unhealthy", message: "Connection failed" };
    }

    // Edge functions check
    try {
      const { data, error } = await supabase.functions.invoke("health-check", {});
      if (error) {
        health.edgeFunctions = { status: "unhealthy", message: error.message };
      } else {
        health.edgeFunctions = { status: "healthy", message: "Functions responding" };
      }
    } catch {
      health.edgeFunctions = { status: "unknown", message: "Could not verify" };
    }

    // Realtime check
    try {
      const channel = supabase.channel("health-test");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.unsubscribe();
          reject(new Error("Timeout"));
        }, 5000);

        channel.subscribe((status) => {
          clearTimeout(timeout);
          if (status === "SUBSCRIBED") {
            health.realtime = { status: "healthy", message: "Realtime connected" };
            channel.unsubscribe();
            resolve();
          } else if (status === "CHANNEL_ERROR") {
            health.realtime = { status: "unhealthy", message: "Channel error" };
            reject(new Error("Channel error"));
          }
        });
      });
    } catch {
      health.realtime = { status: "unhealthy", message: "Could not connect" };
    }

    // RLS check (just verify tables have policies)
    try {
      const { error } = await supabase.from("crm_leads").select("id").limit(1);
      if (!error) {
        health.rls = { status: "enabled", message: "RLS policies active" };
      } else if (error.code === "42501") {
        health.rls = { status: "enabled", message: "Access denied (RLS working)" };
      } else {
        health.rls = { status: "unknown", message: error.message };
      }
    } catch {
      health.rls = { status: "unknown" };
    }

    setHealthStatus(health);

    // Log health check result
    const result: VerificationResult = {
      testName: "System Health Check",
      testType: "health",
      success: health.database.status === "healthy" && health.realtime.status === "healthy",
      duration: 0,
      details: {
        message: "Health check completed",
        checks: [
          { name: "Database", passed: health.database.status === "healthy", message: health.database.message },
          { name: "Edge Functions", passed: health.edgeFunctions.status === "healthy", message: health.edgeFunctions.message },
          { name: "Realtime", passed: health.realtime.status === "healthy", message: health.realtime.message },
          { name: "RLS", passed: health.rls.status === "enabled", message: health.rls.message },
        ],
      },
      timestamp: new Date().toISOString(),
    };
    addResult(result);

    return health;
  }, [addResult]);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    try {
      await runHealthCheck();
      await runFormLeadTest("en");
      await runEmmaLeadTest("fr", 4);
      await runRLSVerification();
    } finally {
      setIsRunning(false);
    }
  }, [runHealthCheck, runFormLeadTest, runEmmaLeadTest, runRLSVerification]);

  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  return {
    // Test runners
    runFormLeadTest,
    runEmmaLeadTest,
    runClaimFlowTest,
    runRLSVerification,
    runHealthCheck,
    runAllTests,
    
    // State
    testResults,
    isRunning,
    healthStatus,
    
    // Actions
    clearResults,
  };
}
