/**
 * Data Builders
 * Transform analysis results into visualization-specific data structures
 */

export { SunburstDataBuilder, type FileAnalysis } from './SunburstDataBuilder';
export { DependencyGraphBuilder, type FileImport, type FileInfo } from './DependencyGraphBuilder';
export { TreemapDataBuilder, type CategoryIssues } from './TreemapDataBuilder';
export { TimelineDataBuilder, type HistoricalAnalysis } from './TimelineDataBuilder';
export { ModuleAggregator } from './ModuleAggregator';
export { StackedBarDataBuilder } from './StackedBarDataBuilder';
export { TestCoverageDataBuilder, type CoverageReport, type TestFileMapping } from './TestCoverageDataBuilder';
export { I18nDataBuilder, type TranslationFile, type LocaleMetadata } from './I18nDataBuilder';
export { ArcDiagramDataBuilder } from './ArcDiagramDataBuilder';
export { MatrixViewDataBuilder } from './MatrixViewDataBuilder';
export { ParallelCoordinatesDataBuilder } from './ParallelCoordinatesDataBuilder';
export { StreamGraphDataBuilder } from './StreamGraphDataBuilder';
export { CalendarHeatmapDataBuilder } from './CalendarHeatmapDataBuilder';
export { GaugeDataBuilder } from './GaugeDataBuilder';
export { FlameGraphDataBuilder } from './FlameGraphDataBuilder';
