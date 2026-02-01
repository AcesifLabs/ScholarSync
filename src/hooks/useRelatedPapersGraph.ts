import { useCallback, useEffect, useRef } from 'react';
import {
    useNodesState,
    useEdgesState,
    MarkerType,
    Edge
} from '@xyflow/react';
import { useLazyGetPaperByIdQuery, useLazyGetRelatedPapersQuery } from '../services/paperApi';
import { Paper, ReadingList } from '../types';
import { PaperNodeType } from '../components/PaperNode';

export const useRelatedPapersGraph = (
    paperId: string | null,
    savedPapers: Record<string, Paper>,
    handleAddToReadlist: (paper: Paper, targetListId?: string) => void,
    readlists: ReadingList[]
) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<PaperNodeType>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [triggerGetPaper] = useLazyGetPaperByIdQuery();
    const [triggerGetRelated] = useLazyGetRelatedPapersQuery();

    const onFindRelatedRef = useRef<(paper: Paper) => Promise<void>>(async () => { });

    const onFindRelated = useCallback(async (paper: Paper) => {
        try {
            const related = await triggerGetRelated(paper).unwrap();

            setNodes(nds => {
                const currentNode = nds.find(n => n.id === paper.id);
                if (!currentNode) return nds;

                const newNodes: PaperNodeType[] = [];
                const newEdges: Edge[] = [];

                related.forEach((p, index) => {
                    if (nds.some(n => n.id === p.id)) {
                        newEdges.push({
                            id: `e-${paper.id}-${p.id}`,
                            source: paper.id,
                            target: p.id,
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
                            style: { stroke: '#0ea5e9', strokeWidth: 2 }
                        });
                        return;
                    }

                    const angle = (index / related.length) * 2 * Math.PI;
                    const radius = 500;
                    const x = currentNode.position.x + radius * Math.cos(angle);
                    const y = currentNode.position.y + radius * Math.sin(angle);

                    newNodes.push({
                        id: p.id,
                        type: 'paper',
                        data: {
                            paper: p,
                            onFindRelated: (p) => onFindRelatedRef.current(p),
                            isSaved: !!savedPapers[p.id],
                            onAddToReadList: handleAddToReadlist,
                            readLists: readlists
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
    }, [setNodes, setEdges, savedPapers, handleAddToReadlist, triggerGetRelated]);

    useEffect(() => {
        onFindRelatedRef.current = onFindRelated;
    }, [onFindRelated]);

    useEffect(() => {
        if (!paperId) return;

        const initGraph = async () => {
            try {
                const rootPaper = await triggerGetPaper(paperId).unwrap();

                const initialNode: PaperNodeType = {
                    id: rootPaper.id,
                    type: 'paper',
                    data: {
                        paper: rootPaper,
                        onFindRelated,
                        isSaved: !!savedPapers[rootPaper.id],
                        onAddToReadList: handleAddToReadlist,
                        readLists: readlists
                    },
                    position: { x: 0, y: 0 },
                };

                const related = await triggerGetRelated(rootPaper).unwrap();
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
                            onAddToReadlist: handleAddToReadlist,
                            readlists
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
    }, [paperId, onFindRelated, handleAddToReadlist, savedPapers, setNodes, setEdges, triggerGetPaper, triggerGetRelated]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setEdges
    };
};
