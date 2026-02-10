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

export async function fetchStructure(): Promise<BepiStructure[]> {
  const { data, error } = await supabase.functions.invoke("bepi-data", {
    body: { action: "get_structure" },
  });

  if (error) throw error;
  return data as BepiStructure[];
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
  return data as BepiDataPoint[];
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
