import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; latency_ms?: number; error?: string };
    storage: { status: 'ok' | 'error'; error?: string };
    resend: { status: 'ok' | 'error' | 'not_configured'; error?: string };
  };
  version: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'ok' },
      storage: { status: 'ok' },
      resend: { status: 'ok' },
    },
    version: '1.1.0',
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check database connectivity with latency
    const dbStart = performance.now();
    try {
      const { error: dbError } = await supabase
        .from('site_languages')
        .select('language_code')
        .limit(1);
      
      healthStatus.checks.database.latency_ms = Math.round(performance.now() - dbStart);
      
      if (dbError) {
        healthStatus.checks.database.status = 'error';
        healthStatus.checks.database.error = dbError.message;
        healthStatus.status = 'degraded';
      }
    } catch (dbErr) {
      healthStatus.checks.database.status = 'error';
      healthStatus.checks.database.error = dbErr instanceof Error ? dbErr.message : 'Unknown error';
      healthStatus.status = 'unhealthy';
    }

    // Check storage connectivity
    try {
      const { error: storageError } = await supabase.storage.listBuckets();
      
      if (storageError) {
        healthStatus.checks.storage.status = 'error';
        healthStatus.checks.storage.error = storageError.message;
        if (healthStatus.status === 'healthy') {
          healthStatus.status = 'degraded';
        }
      }
    } catch (storageErr) {
      healthStatus.checks.storage.status = 'error';
      healthStatus.checks.storage.error = storageErr instanceof Error ? storageErr.message : 'Unknown error';
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    }

    // Check Resend API key configuration
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      healthStatus.checks.resend = { status: 'not_configured' };
      // Don't degrade status for missing Resend - it's optional
    } else {
      // Verify the API key format (starts with re_)
      if (!resendApiKey.startsWith('re_')) {
        healthStatus.checks.resend = { 
          status: 'error', 
          error: 'Invalid API key format' 
        };
      } else {
        healthStatus.checks.resend = { status: 'ok' };
      }
    }

    // Log health check
    console.log(`Health check: ${healthStatus.status}`, JSON.stringify(healthStatus.checks));

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                       healthStatus.status === 'degraded' ? 200 : 503;

    return new Response(
      JSON.stringify(healthStatus),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Health check failed:', err);
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'error', error: 'Connection failed' },
          storage: { status: 'error', error: 'Connection failed' },
          resend: { status: 'error', error: 'Check failed' },
        },
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
