import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, grupo, detalhado, anoMin, anoMax } = await req.json();

    if (action === "get_structure") {
      // Get groups and their subtopics
      const { data, error } = await supabase
        .from("balanco_epi_cons")
        .select('"Grupo", "Detalhado"')
        .schema("sumer");

      if (error) {
        // Fallback: raw SQL
        const { data: sqlData, error: sqlError } = await supabase.rpc("exec_sql", {
          query: `SELECT DISTINCT "Grupo", "Detalhado" FROM sumer.balanco_epi_cons ORDER BY "Grupo", "Detalhado"`,
        });

        if (sqlError) throw sqlError;
        return new Response(JSON.stringify(sqlData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Deduplicate
      const seen = new Set<string>();
      const unique = (data || []).filter((r: any) => {
        const key = `${r.Grupo}|${r.Detalhado}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return new Response(JSON.stringify(unique), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_data") {
      // Build query for chart data
      let query = `
        SELECT "Ano", "Agregação", "Origem da Energia", "Tipo de fonte", "Valor da Energia"
        FROM sumer.balanco_epi_cons
        WHERE "Grupo" = '${grupo.replace(/'/g, "''")}'
          AND "Detalhado" = '${detalhado.replace(/'/g, "''")}'
      `;

      if (anoMin && anoMax) {
        query += ` AND "Ano" >= ${parseInt(anoMin)} AND "Ano" <= ${parseInt(anoMax)}`;
      }

      query += ` AND "Valor da Energia" IS NOT NULL AND "Valor da Energia" != 0 ORDER BY "Ano"`;

      const { data, error } = await supabase.rpc("exec_sql", {
        query,
      });

      if (error) throw error;

      return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
