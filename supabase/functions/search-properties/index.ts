 import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 const LANGUAGE_MAP: Record<string, number> = {
   en: 1, es: 2, de: 3, fr: 4, nl: 5, ru: 6, pl: 7, it: 8, pt: 9, sv: 10, no: 11, da: 12, fi: 13
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const body = await req.json();
     console.log('📦 Search request:', JSON.stringify(body));
     
     const { lang = 'en', page = 1, limit = 20, ...filters } = body;
     const langNum = LANGUAGE_MAP[lang] || 1;
     
     const postBody = {
       ...filters,
       pageSize: limit,
       pageNo: page,
       lang: langNum
     };
 
     const proxyUrl = 'http://188.34.164.137:3000/search';
     console.log('🌐 POST to proxy:', proxyUrl, JSON.stringify(postBody));
     
     const response = await fetch(proxyUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(postBody),
     });
 
     if (!response.ok) {
       throw new Error(`Proxy error: ${response.status}`);
     }
 
     const data = await response.json();
     const properties = data.properties || [];
     
     console.log(`✅ Returning ${properties.length} properties`);
     
     return new Response(
       JSON.stringify({
         properties,
         total: data.total || properties.length,
         page,
         pageSize: limit,
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error: any) {
     console.error('❌ Error:', error);
     return new Response(
       JSON.stringify({ error: error?.message || 'Search failed' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });