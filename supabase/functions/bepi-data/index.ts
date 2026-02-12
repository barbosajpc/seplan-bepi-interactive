import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== CONSTANTS ==========
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ACTIONS = {
  GET_STRUCTURE: "get_structure",
  GET_YEAR_RANGE: "get_year_range",
  GET_DATA: "get_data",
} as const;

const STATUS_CODES = {
  OK: 200,
  BAD_REQUEST: 400,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: "grupo e detalhado são obrigatórios",
  YEAR_RANGE_NOT_FOUND: "Não foi possível determinar o range de anos.",
  UNKNOWN_ACTION: "Unknown action",
  INVALID_JSON: "Body JSON inválido.",
} as const;

type SupabaseClient = ReturnType<typeof createClient>;
type YearRange = { minAno: number | null; maxAno: number | null };

// ========== HELPER FUNCTIONS ==========

function sanitizeSqlString(value: string): string {
  return String(value ?? "").replace(/'/g, "''");
}

function toIntOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function createJsonResponse(
  payload: unknown,
  status: number = STATUS_CODES.OK
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function ok(data: unknown, status: number = STATUS_CODES.OK) {
  return createJsonResponse({ ok: true, data }, status);
}

function fail(error: string, status: number) {
  return createJsonResponse({ ok: false, error }, status);
}

function validateRequiredFields(
  grupo: string | undefined,
  detalhado: string | undefined
): { valid: boolean; error?: Response } {
  if (!grupo || !detalhado) {
    return {
      valid: false,
      error: fail(ERROR_MESSAGES.REQUIRED_FIELDS, STATUS_CODES.BAD_REQUEST),
    };
  }
  return { valid: true };
}

// ========== DATA ACCESS ==========

async function getYearRange(
  supabase: SupabaseClient,
  grupo: string,
  detalhado: string
): Promise<YearRange> {
  const safeGrupo = sanitizeSqlString(grupo);
  const safeDetalhado = sanitizeSqlString(detalhado);

  const query = `
    SELECT
      MIN("Ano")::int AS "minAno",
      MAX("Ano")::int AS "maxAno"
    FROM sumer.balanco_epi_cons
    WHERE "Grupo" = '${safeGrupo}'
      AND "Detalhado" = '${safeDetalhado}'
      AND "Valor da Energia" IS NOT NULL
      AND "Valor da Energia" != 0
  `;

  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) throw error;

  const row = data?.[0] ?? {};
  return {
    minAno: toIntOrNull((row as any).minAno),
    maxAno: toIntOrNull((row as any).maxAno),
  };
}

// ========== ACTION HANDLERS ==========

async function handleGetStructure(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.rpc("exec_sql", {
    query: `SELECT DISTINCT "Grupo", "Detalhado" FROM sumer.balanco_epi_cons ORDER BY "Grupo", "Detalhado"`,
  });

  if (error) throw error;
  return ok(data || []);
}

async function handleGetYearRange(
  supabase: SupabaseClient,
  grupo: string | undefined,
  detalhado: string | undefined
): Promise<Response> {
  const validation = validateRequiredFields(grupo, detalhado);
  if (!validation.valid) return validation.error!;

  const yearRange = await getYearRange(supabase, grupo!, detalhado!);
  return ok(yearRange);
}

async function handleGetData(
  supabase: SupabaseClient,
  grupo: string | undefined,
  detalhado: string | undefined,
  anoMin: string | number | undefined,
  anoMax: string | number | undefined
): Promise<Response> {
  const validation = validateRequiredFields(grupo, detalhado);
  if (!validation.valid) return validation.error!;

  const safeGrupo = sanitizeSqlString(grupo!);
  const safeDetalhado = sanitizeSqlString(detalhado!);

  let minYear = Number.isFinite(Number(anoMin)) ? parseInt(String(anoMin), 10) : NaN;
  let maxYear = Number.isFinite(Number(anoMax)) ? parseInt(String(anoMax), 10) : NaN;

  // Se não veio anoMin/anoMax, busca do banco
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    const yr = await getYearRange(supabase, grupo!, detalhado!);
    minYear = Number(yr.minAno);
    maxYear = Number(yr.maxAno);
  }

  // Validação final do range de anos
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return fail(
      ERROR_MESSAGES.YEAR_RANGE_NOT_FOUND,
      STATUS_CODES.UNPROCESSABLE_ENTITY
    );
  }

  const query = `
    SELECT "Ano", "Agregação", "Origem da Energia", "Tipo de fonte", "Valor da Energia"
    FROM sumer.balanco_epi_cons
    WHERE "Grupo" = '${safeGrupo}'
      AND "Detalhado" = '${safeDetalhado}'
      AND "Ano" >= ${minYear}
      AND "Ano" <= ${maxYear}
      AND "Valor da Energia" IS NOT NULL
      AND "Valor da Energia" != 0
    ORDER BY "Ano"
  `;

  const { data, error } = await supabase.rpc("exec_sql", { query });
  if (error) throw error;

  return ok(data || []);
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => null);
    if (!body) {
      return fail(ERROR_MESSAGES.INVALID_JSON, STATUS_CODES.BAD_REQUEST);
    }

    const { action, grupo, detalhado, anoMin, anoMax } = body;

    // Route
    switch (action) {
      case ACTIONS.GET_STRUCTURE:
        return await handleGetStructure(supabase);

      case ACTIONS.GET_YEAR_RANGE:
        return await handleGetYearRange(supabase, grupo, detalhado);

      case ACTIONS.GET_DATA:
        return await handleGetData(supabase, grupo, detalhado, anoMin, anoMax);

      default:
        return fail(ERROR_MESSAGES.UNKNOWN_ACTION, STATUS_CODES.BAD_REQUEST);
    }
  } catch (error) {
    return fail(
      error?.message ?? String(error),
      STATUS_CODES.INTERNAL_SERVER_ERROR
    );
  }
});
