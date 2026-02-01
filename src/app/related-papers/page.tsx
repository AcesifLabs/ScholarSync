'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useRelatedPapersGraph } from '@/hooks/useRelatedPapersGraph';
import { useReadLists } from '@/hooks/useReadLists';
import { PaperNode } from '@/components/PaperNode';
import { GraphHeader } from '@/components/graph/GraphHeader';

const nodeTypes: NodeTypes = {
    paper: PaperNode,
};

function RelatedPapersContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paperId = searchParams.get('paperId');

    const {
        savedPapers,
        handleAddToReadList,
        readLists
    } = useReadLists();

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setEdges
    } = useRelatedPapersGraph(paperId, savedPapers, handleAddToReadList, readLists);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    return (
        <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
            <GraphHeader
                nodeCount={nodes.length}
                onBack={() => router.push('/')}
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

export default function RelatedPapers() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
            <RelatedPapersContent />
        </Suspense>
    );
}
