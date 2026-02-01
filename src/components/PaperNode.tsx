import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PaperNodeType } from '@/types';
import { PaperCard } from './PaperCard';

export const PaperNode = memo(({ data }: NodeProps<PaperNodeType>) => {
  return (
    <div className="w-[300px] cursor-default">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-scholar-500 !w-3 !h-3 !border-2 !border-white shadow-sm"
      />
      <div className="bg-white rounded-xl shadow-xl border-2 border-slate-100 overflow-hidden hover:border-scholar-400 transition-colors">
        <PaperCard
          paper={data.paper}
          onFindRelatedAction={data.onFindRelatedAction}
          isSaved={data.isSaved}
          onAddToReadListAction={data.onAddToReadListAction}
          readLists={data.readLists}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-scholar-500 !w-3 !h-3 !border-2 !border-white shadow-sm"
      />
    </div>
  );
});

PaperNode.displayName = 'PaperNode';
