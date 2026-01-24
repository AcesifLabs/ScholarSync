import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Edge,
  MarkerType,
  Connection,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { getPaperById, findRelatedPapers } from '../services/paperService.ts';
import { Paper, Readlist } from '../types';
import { PaperNode, PaperNodeType } from '../components/PaperNode';

const nodeTypes: NodeTypes = {
  paper: PaperNode,
};

export default function RelatedPapers() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paperId = searchParams.get('paperId');

  const [nodes, setNodes, onNodesChange] = useNodesState<PaperNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [readlists, setReadlists] = useState<Readlist[]>(() => {
    const saved = localStorage.getItem('scholar_readlists');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedPapers, setSavedPapers] = useState<Record<string, Paper>>(() => {
    const saved = localStorage.getItem('scholar_papers');
    return saved ? JSON.parse(saved) : {};
  });

  const handleAddToReadlist = useCallback((paper: Paper) => {
    const targetListId = readlists[0]?.id;
    if (!targetListId) {
        alert("Please create a readlist on the home page first.");
        return;
    }

    setSavedPapers(prev => {
        const next = { ...prev, [paper.id]: paper };
        localStorage.setItem('scholar_papers', JSON.stringify(next));
        return next;
    });

    setReadlists(prev => {
        const next = prev.map(list => {
            if (list.id === targetListId) {
                if (list.paperIds.includes(paper.id)) return list;
                return { ...list, paperIds: [...list.paperIds, paper.id] };
            }
            return list;
        });
        localStorage.setItem('scholar_readlists', JSON.stringify(next));
        return next;
    });
  }, [readlists]);

  const onFindRelated = useCallback(async (paper: Paper) => {
    try {
      const related = await findRelatedPapers(paper);
      
      setNodes(nds => {
          const currentNode = nds.find(n => n.id === paper.id);
          if (!currentNode) return nds;

          const newNodes: PaperNodeType[] = [];
          const newEdges: Edge[] = [];

          related.forEach((p, index) => {
            if (nds.some(n => n.id === p.id)) {
                // Edge to existing node
                newEdges.push({
                    id: `e-${paper.id}-${p.id}`,
                    source: paper.id,
                    target: p.id,
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
                    style: { stroke: '#0ea5e9', strokeWidth: 2 }
                });
                return;
            }

            // Calculate position in a circle around parent
            const angle = (index / related.length) * 2 * Math.PI;
            const radius = 500;
            const x = currentNode.position.x + radius * Math.cos(angle);
            const y = currentNode.position.y + radius * Math.sin(angle);

            newNodes.push({
              id: p.id,
              type: 'paper',
              data: { 
                paper: p, 
                onFindRelated, 
                isSaved: !!savedPapers[p.id],
                onAddToReadlist: handleAddToReadlist
              },
              position: { x, y },
            });

            newEdges.push({
              id: `e-${paper.id}-${p.id}`,
              source: paper.id,
              target: p.id,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
              style: { stroke: '#0ea5e9', strokeWidth: 2 }
            });
          });

          setEdges(eds => eds.concat(newEdges));
          return nds.concat(newNodes);
      });
    } catch (err) {
      console.error("Failed to expand graph:", err);
    }
  }, [setNodes, setEdges, savedPapers, handleAddToReadlist]);

  useEffect(() => {
    if (!paperId) return;

    const initGraph = async () => {
      try {
        const rootPaper = await getPaperById(paperId);
        
        const initialNode: PaperNodeType = {
          id: rootPaper.id,
          type: 'paper',
          data: { 
            paper: rootPaper, 
            onFindRelated, 
            isSaved: !!savedPapers[rootPaper.id],
            onAddToReadlist: handleAddToReadlist
          },
          position: { x: 0, y: 0 },
        };

        const related = await findRelatedPapers(rootPaper);
        const firstLevelNodes: PaperNodeType[] = related.map((p, index) => {
          const angle = (index / related.length) * 2 * Math.PI;
          const radius = 500;
          return {
            id: p.id,
            type: 'paper',
            data: { 
              paper: p, 
              onFindRelated, 
              isSaved: !!savedPapers[p.id],
              onAddToReadlist: handleAddToReadlist
            },
            position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
          };
        });

        const firstLevelEdges: Edge[] = related.map(p => ({
          id: `e-${rootPaper.id}-${p.id}`,
          source: rootPaper.id,
          target: p.id,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
          style: { stroke: '#0ea5e9', strokeWidth: 2 }
        }));

        setNodes([initialNode, ...firstLevelNodes]);
        setEdges(firstLevelEdges);
      } catch (err) {
        console.error("Failed to initialize graph:", err);
      }
    };

    initGraph();
  }, [paperId, onFindRelated, handleAddToReadlist, savedPapers]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            title="Back to Search"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-scholar-600" size={28} />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Research Graph</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{nodes.length} Papers Found</span>
                <span className="text-xs text-slate-500">Drag to pan • Scroll to zoom • Click "Related" to build</span>
            </div>
        </div>
      </header>

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
