import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BepiHeader } from "@/components/BepiHeader";
import { BepiSidebar } from "@/components/BepiSidebar";
import { BepiChart } from "@/components/BepiChart";
import { YearSlider } from "@/components/YearSlider";
import { fetchStructure, fetchChartData, groupStructure } from "@/lib/bepi-api";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedDetalhado, setSelectedDetalhado] = useState<string | null>(null);
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

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["bepi-chart", selectedGrupo, selectedDetalhado, yearRange[0], yearRange[1]],
    queryFn: () => fetchChartData(selectedGrupo!, selectedDetalhado!, yearRange[0], yearRange[1]),
    enabled: !!selectedGrupo && !!selectedDetalhado,
  });

  const handleSelect = (grupo: string, detalhado: string) => {
    setSelectedGrupo(grupo);
    setSelectedDetalhado(detalhado);
  };

  const chartTitle = selectedDetalhado
    ? `${selectedDetalhado}`
    : "Selecione um item no menu";

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
                <div>
                  <p className="text-sm text-muted-foreground font-heading">{selectedGrupo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-heading">Período:</span>
                  <YearSlider min={1947} max={2024} value={yearRange} onChange={setYearRange} />
                </div>
              </div>

              {chartLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <BepiChart data={chartData || []} title={chartTitle} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
