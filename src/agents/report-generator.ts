import type { AnalysisReport } from '../models/analysis-report.js';
import { formatAsMarkdown, formatAsJson } from '../tools/shared/report.js';
import { writeFileSync } from 'fs';

export class ReportGenerator {
  generate(report: AnalysisReport, format: 'json' | 'markdown'): string {
    if (format === 'json') {
      return formatAsJson(report);
    }
    return formatAsMarkdown(report);
  }

  save(report: AnalysisReport, path: string, format: 'json' | 'markdown'): void {
    const content = this.generate(report, format);
    writeFileSync(path, content);
  }
}
