import { MindMapNode } from '@yia/shared';
import clsx from 'clsx';
import { useState } from 'react';

type MindMapProps = {
  data: MindMapNode | null;
  onSelect?: (node: MindMapNode) => void;
};

type MindMapItemProps = {
  node: MindMapNode;
  depth: number;
  onSelect?: (node: MindMapNode) => void;
};

const MindMapItem = ({ node, depth, onSelect }: MindMapItemProps) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className={clsx('border-l pl-4', depth === 0 && 'border-l-0 pl-0')}>
      <button
        type="button"
        className="flex items-start gap-2 text-left w-full py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
        onClick={() => {
          setExpanded((prev) => !prev);
          onSelect?.(node);
        }}
        aria-expanded={expanded}
      >
        {hasChildren && (
          <span
            className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-700"
            aria-hidden
          >
            {expanded ? '-' : '+'}
          </span>
        )}
        <span className="flex-1">
          <span className="font-medium text-slate-900 dark:text-slate-100">{node.label}</span>
          {(node.start ?? node.end) !== undefined && (
            <span className="ml-2 text-xs text-slate-500">
              {node.start?.toFixed?.(0)}s – {node.end?.toFixed?.(0)}s
            </span>
          )}
        </span>
      </button>
      {hasChildren && expanded && (
        <div className="ml-6 border-l border-dashed border-slate-300">
          {node.children?.map((child) => (
            <MindMapItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export const MindMap = ({ data, onSelect }: MindMapProps) => {
  if (!data) {
    return <p className="text-sm text-slate-500">Mind map will appear after analysis.</p>;
  }

  return (
    <div role="tree" aria-label="Mind map" className="space-y-2">
      <MindMapItem node={data} depth={0} onSelect={onSelect} />
    </div>
  );
};
