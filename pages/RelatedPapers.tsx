import React, { useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  MarkerType,
  Connection,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRelatedPapersGraph } from '../hooks/useRelatedPapersGraph';
import { useReadlists } from '../hooks/useReadlists';
import { PaperNode } from '../components/PaperNode';
import { GraphHeader } from '../components/graph/GraphHeader';

const nodeTypes: NodeTypes = {
  paper: PaperNode,
};

export default function RelatedPapers() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paperId = searchParams.get('paperId');

  const {
    savedPapers,
    handleAddToReadlist
  } = useReadlists();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setEdges
  } = useRelatedPapersGraph(paperId, savedPapers, handleAddToReadlist);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
      <GraphHeader
        nodeCount={nodes.length}
        onBack={() => navigate('/')}
      />

      <div className="flex-grow relative bg-[#f8fafc]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          maxZoom={1.5}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
            style: { stroke: '#0ea5e9', strokeWidth: 2 }
          }}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
