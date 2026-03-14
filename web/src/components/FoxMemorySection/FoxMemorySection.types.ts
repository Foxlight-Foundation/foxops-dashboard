import type { FoxmemoryResponse, ChartRange, SectionHealth } from '../../types';

export interface FoxMemorySectionProps {
  foxmemory: FoxmemoryResponse | undefined;
  chartRange: ChartRange;
  onChartRangeChange: (range: ChartRange) => void;
  tabHealth?: { performance?: SectionHealth; agents?: SectionHealth; graph?: SectionHealth };
  agentId?: string | null;
}
