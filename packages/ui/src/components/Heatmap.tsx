import { HeatmapPoint } from '@yia/shared';
import clsx from 'clsx';

type HeatmapProps = {
  data: HeatmapPoint[];
};

export const Heatmap = ({ data }: HeatmapProps) => {
  if (!data?.length) {
    return <p className="text-sm text-slate-500">Heatmap will be available after analysis.</p>;
  }

  const maxIntensity = Math.max(...data.map((point) => point.intensity));

  return (
    <div className="grid grid-cols-12 gap-1" role="list" aria-label="Timeline heatmap">
      {data.map((point) => (
        <button
          key={point.time}
          type="button"
          className={clsx(
            'h-12 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
            'transition-colors duration-200'
          )}
          style={{
            backgroundColor: `rgba(79, 70, 229, ${(point.intensity / maxIntensity).toFixed(2)})`
          }}
          aria-label={`Minute ${Math.floor(point.time / 60)} intensity ${point.intensity}`}
        />
      ))}
    </div>
  );
};
