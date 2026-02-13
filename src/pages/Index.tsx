import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BepiHeader } from "@/components/BepiHeader";
import { BepiSidebar } from "@/components/BepiSidebar";
import { BepiChart } from "@/components/BepiChart";
import { YearSlider } from "@/components/YearSlider";
import {
  fetchStructure,
  fetchChartData,
  groupStructure,
  fetchYearRange,
} from "@/lib/bepi-api";
import { normalizeRange } from "@/lib/yearRange";
import { Loader2 } from "lucide-react";

function splitNumberPrefix(label: string | null | undefined): {
  numberPrefix: string | null;
  text: string;
} {
  const raw = (label ?? "").trim();
  if (!raw) return { numberPrefix: null, text: "" };

  // Ex.: "6. Perdas" | "6.1 PERDAS ..." | "2.11. TÊXTIL"
  const m = raw.match(/^\s*(\d+(?:\.\d+)*)\s*(?:[.\-–:])?\s*(.*)$/);
  if (!m) return { numberPrefix: null, text: raw };

  const numberPrefix = m[1] ?? null;
  const rest = (m[2] ?? "").trim();

  return { numberPrefix, text: rest || raw };
}

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedDetalhado, setSelectedDetalhado] = useState<string | null>(null);

  const [yearBounds, setYearBounds] = useState<{ min: number; max: number }>({
    min: 1947,
    max: 2024,
  });

  const [yearRange, setYearRange] = useState<[number, number]>([1970, 2024]);

  const { data: rawStructure, isLoading: structureLoading } = useQuery({
    queryKey: ["bepi-structure"],
    queryFn: fetchStructure,
    staleTime: Infinity,
  });

  const structure = useMemo(() => {
    if (!rawStructure) return [];
    return groupStructure(rawStructure);
  }, [rawStructure]);

  // Auto-select first item
  useEffect(() => {
    if (structure.length > 0 && !selectedGrupo) {
      const first = structure[0];
      setSelectedGrupo(first.grupo);
      if (first.detalhados.length > 0) {
        setSelectedDetalhado(first.detalhados[0]);
      }
    }
  }, [structure, selectedGrupo]);

  // ✅ Atualiza limites do slider quando muda o item selecionado
  useEffect(() => {
    if (!selectedGrupo || !selectedDetalhado) return;

    let cancelled = false;

    (async () => {
      const { minAno, maxAno } = await fetchYearRange(selectedGrupo, selectedDetalhado);

      if (cancelled) return;

      if (minAno == null || maxAno == null) {
        setYearBounds({ min: 0, max: 0 });
        setYearRange([0, 0]);
        return;
      }

      setYearBounds({ min: minAno, max: maxAno });
      setYearRange([minAno, maxAno]);
    })().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [selectedGrupo, selectedDetalhado]);

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["bepi-chart", selectedGrupo, selectedDetalhado, yearRange[0], yearRange[1]],
    queryFn: () =>
      fetchChartData(selectedGrupo!, selectedDetalhado!, yearRange[0], yearRange[1]),
    enabled: !!selectedGrupo && !!selectedDetalhado,
  });

  const handleSelect = (grupo: string, detalhado: string) => {
    setSelectedGrupo(grupo);
    setSelectedDetalhado(detalhado);
    setYearRange([yearBounds.min, yearBounds.max]);
  };

  // ✅ Numeração automática baseada na estrutura (fallback)
  const { groupNumberAuto, itemNumberAuto } = useMemo(() => {
    if (!selectedGrupo || !selectedDetalhado) {
      return { groupNumberAuto: null as string | null, itemNumberAuto: null as string | null };
    }

    const gIndex = structure.findIndex((g) => g.grupo === selectedGrupo);
    if (gIndex < 0) return { groupNumberAuto: null, itemNumberAuto: null };

    const groupNumberAuto = String(gIndex + 1);

    const group = structure[gIndex];
    const dIndex = group.detalhados.findIndex((d) => d === selectedDetalhado);
    const itemNumberAuto = dIndex >= 0 ? `${groupNumberAuto}.${dIndex + 1}` : null;

    return { groupNumberAuto, itemNumberAuto };
  }, [structure, selectedGrupo, selectedDetalhado]);

  // ✅ Se já vier numerado no texto, respeita. Senão, usa a numeração automática.
  const groupParsed = splitNumberPrefix(selectedGrupo);
  const itemParsed = splitNumberPrefix(selectedDetalhado);

  const groupTitle = groupParsed.text || (selectedGrupo ?? "");
  const groupNumber = groupParsed.numberPrefix ?? groupNumberAuto;

  const subtitle =
    itemParsed.text || (selectedDetalhado ?? "Selecione um item no menu");

  const subtitleNumber = itemParsed.numberPrefix ?? itemNumberAuto;

  return (
    <div className="flex flex-col h-screen bg-background">
      <BepiHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <BepiSidebar
            structure={structure}
            selectedGrupo={selectedGrupo}
            selectedDetalhado={selectedDetalhado}
            onSelect={handleSelect}
          />
        )}

        <main className="flex-1 overflow-y-auto p-6">
          {structureLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {/* ✅ REMOVIDO: esse texto pequeno repetia o título do gráfico */}
                <div />

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-heading">
                    Período:
                  </span>

                  <YearSlider
                    min={yearBounds.min}
                    max={yearBounds.max}
                    value={yearRange}
                    onChange={(v) =>
                      setYearRange(
                        normalizeRange(v[0], v[1], yearBounds.min, yearBounds.max)
                      )
                    }
                  />
                </div>
              </div>

              {chartLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <BepiChart
                  data={chartData || []}
                  groupTitle={groupTitle}
                  groupNumber={groupNumber}
                  subtitle={subtitle}
                  subtitleNumber={subtitleNumber}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
