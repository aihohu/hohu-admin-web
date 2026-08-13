import type { Component } from 'vue';
import RowsAffectedView from './RowsAffectedView.vue';
import DataListView from './DataListView.vue';
import StatsChartView from './StatsChartView.vue';
import DetailCardView from './DetailCardView.vue';
import PlainJsonView from './PlainJsonView.vue';

const TOOL_VIEW_REGISTRY: Record<Api.Ai.ViewType, Component> = {
  rows_affected: RowsAffectedView,
  data_list: DataListView,
  stats_chart: StatsChartView,
  detail_card: DetailCardView,
  plain_json: PlainJsonView
};

/** resolve a structured tool result view, falling back safely for unknown server values */
export function resolveToolView(viewType: Api.Ai.ViewType | undefined | null): Component {
  if (!viewType || !(viewType in TOOL_VIEW_REGISTRY)) {
    return PlainJsonView;
  }
  return TOOL_VIEW_REGISTRY[viewType];
}

export { PlainJsonView };
