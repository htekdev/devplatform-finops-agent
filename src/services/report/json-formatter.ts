import type { AnalysisReport } from "../../models/analysis-report.js";

export function formatJSON(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

export function parseJSON(json: string): AnalysisReport {
  return JSON.parse(json);
}
