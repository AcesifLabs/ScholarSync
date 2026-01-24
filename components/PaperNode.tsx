import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Paper } from '../types';
import { PaperCard } from './PaperCard';

export type PaperNodeData = {
  paper: Paper;
  onFindRelated: (paper: Paper) => void;
  isSaved: boolean;
  onAddToReadlist: (paper: Paper) => void;
};

export type PaperNodeType = Node<PaperNodeData, 'paper'>;

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
          onFindRelated={data.onFindRelated} 
          isSaved={data.isSaved} 
          onAddToReadlist={data.onAddToReadlist} 
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
