import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    "i"
  );
  return re.exec(html)?.[1] ?? alt.exec(html)?.[1] ?? null;
}

function extractTitle(html: string): string | null {
  return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
}

function extractH1s(html: string): string[] {
  const matches: string[] = [];
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    matches.push(m[1].replace(/<[^>]*>/g, "").trim());
  }
  return matches;
}

function extractCanonical(html: string): string | null {
  return /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(html)?.[1] ?? null;
}

function extractRobots(html: string): string | null {
  return extractMeta(html, "robots");
}

function countWords(html: string): number {
  // Strip everything inside <script> and <style>
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Strip tags
  text = text.replace(/<[^>]*>/g, " ");
  // Decode common entities
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  // Count whitespace-delimited tokens
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

function hasJsonLd(html: string): boolean {
  return /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the URL as Googlebot
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const statusCode = response.status;
    const finalUrl = response.url;

    // Parse SEO elements
    const title = extractTitle(html);
    const metaDescription = extractMeta(html, "description");
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const h1s = extractH1s(html);
    const canonical = extractCanonical(html);
    const robots = extractRobots(html);
    const wordCount = countWords(html);
    const jsonLd = hasJsonLd(html);

    const result = {
      statusCode,
      finalUrl,
      checks: {
        title: { present: !!title, value: title },
        metaDescription: { present: !!metaDescription, value: metaDescription },
        ogTitle: { present: !!ogTitle, value: ogTitle },
        ogDescription: { present: !!ogDescription, value: ogDescription },
        h1: { present: h1s.length > 0, values: h1s, count: h1s.length },
        canonical: { present: !!canonical, value: canonical },
        robots: {
          present: !!robots,
          value: robots,
          isNoindex: robots?.toLowerCase().includes("noindex") ?? false,
        },
        wordCount,
        jsonLd: { present: jsonLd },
      },
      htmlLength: html.length,
      rawHtml: html,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
