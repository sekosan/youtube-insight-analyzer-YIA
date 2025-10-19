import { ExportFormat } from '@yia/shared';

export type ExportButtonsProps = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
};

const formats: ExportFormat[] = ['markdown', 'pdf', 'csv'];

export const ExportButtons = ({ onExport, disabled }: ExportButtonsProps) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Export analysis">
    {formats.map((format) => (
      <button
        key={format}
        type="button"
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={disabled}
        onClick={() => onExport(format)}
      >
        Export {format.toUpperCase()}
      </button>
    ))}
  </div>
);
