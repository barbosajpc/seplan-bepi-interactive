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
      const { data, error } = await supabase.rpc("exec_sql", {
        query: `SELECT DISTINCT "Grupo", "Detalhado" FROM sumer.balanco_epi_cons ORDER BY "Grupo", "Detalhado"`,
      });

      if (error) throw error;
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_data") {
      const safeGrupo = grupo.replace(/'/g, "''");
      const safeDetalhado = detalhado.replace(/'/g, "''");
      const minY = parseInt(anoMin) || 1947;
      const maxY = parseInt(anoMax) || 2024;

      const query = `
        SELECT "Ano", "Agregação", "Origem da Energia", "Tipo de fonte", "Valor da Energia"
        FROM sumer.balanco_epi_cons
        WHERE "Grupo" = '${safeGrupo}'
          AND "Detalhado" = '${safeDetalhado}'
          AND "Ano" >= ${minY}
          AND "Ano" <= ${maxY}
          AND "Valor da Energia" IS NOT NULL
          AND "Valor da Energia" != 0
        ORDER BY "Ano"
      `;

      const { data, error } = await supabase.rpc("exec_sql", { query });
      if (error) throw error;

      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
