import type { FoxmemoryResponse, ChartRange } from '../../types';

export interface FoxMemorySectionProps {
  foxmemory: FoxmemoryResponse | undefined;
  chartRange: ChartRange;
  onChartRangeChange: (range: ChartRange) => void;
}
