import { supabase } from "@/integrations/supabase/client";

export interface BepiStructure {
  Grupo: string;
  Detalhado: string;
}

export interface BepiDataPoint {
  Ano: number;
  "Agregação": string;
  "Origem da Energia": string;
  "Tipo de fonte": string;
  "Valor da Energia": number;
}

type OkResponse<T> = { ok: true; data: T };
type ErrResponse = { ok: false; error: string };

function unwrap<T>(payload: any): T {
  // suporta tanto retorno novo {ok,data} quanto antigo (direto)
  if (payload?.ok === false) throw new Error(payload.error || "Erro na function");
  if (payload?.ok === true) return payload.data as T;
  return payload as T;
}

export async function fetchStructure(): Promise<BepiStructure[]> {
  const { data, error } = await supabase.functions.invoke("bepi-data", {
    body: { action: "get_structure" },
  });

  if (error) throw error;
  return unwrap<BepiStructure[]>(data);
}

export async function fetchYearRange(
  grupo: string,
  detalhado: string
): Promise<{ minAno: number | null; maxAno: number | null }> {
  const { data, error } = await supabase.functions.invoke("bepi-data", {
    body: { action: "get_year_range", grupo, detalhado },
  });

  if (error) throw error;
  return unwrap<{ minAno: number | null; maxAno: number | null }>(data);
}

export async function fetchChartData(
  grupo: string,
  detalhado: string,
  anoMin: number,
  anoMax: number
): Promise<BepiDataPoint[]> {
  const { data, error } = await supabase.functions.invoke("bepi-data", {
    body: { action: "get_data", grupo, detalhado, anoMin, anoMax },
  });

  if (error) throw error;
  return unwrap<BepiDataPoint[]>(data);
}

export interface GroupedStructure {
  grupo: string;
  detalhados: string[];
}

export function groupStructure(data: BepiStructure[]): GroupedStructure[] {
  const map = new Map<string, Set<string>>();
  for (const item of data) {
    if (!map.has(item.Grupo)) map.set(item.Grupo, new Set());
    map.get(item.Grupo)!.add(item.Detalhado);
  }
  return Array.from(map.entries()).map(([grupo, set]) => ({
    grupo,
    detalhados: Array.from(set).sort(),
  }));
}
