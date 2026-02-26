import { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  useNodesState,
  ReactFlowProvider,
  type Node,
  type OnMoveEnd,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBranchTree } from '@/hooks/useBranchTree';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { BranchNode } from './BranchNode';
import { BranchEdge } from './BranchEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { BranchPreviewPopup } from './BranchPreviewPopup';

const nodeTypes: NodeTypes = { branchNode: BranchNode as NodeTypes[string] };
const edgeTypes: EdgeTypes = { branchEdge: BranchEdge as EdgeTypes[string] };

function FlowInner() {
  const { nodes: storeNodes, edges } = useBranchTree();
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const { fitViewTrigger, setViewport } = useCanvasStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);

  // Sync store → React Flow local state when branches are added/removed/updated.
  // Preserve positions already set by dragging so they don't snap back.
  useEffect(() => {
    setNodes((prev) => {
      const posMap = new Map(prev.map((n) => [n.id, n.position]));
      return storeNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }));
    });
  }, [storeNodes, setNodes]);

  useEffect(() => {
    if (fitViewTrigger > 0) {
      fitView({ duration: 400, padding: 0.15 });
    }
  }, [fitViewTrigger, fitView]);

  // Initial fit on mount
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 600, padding: 0.15 }), 100);
    return () => clearTimeout(t);
  }, [fitView]);

  const handleMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Persist dragged position to the store so it survives re-renders
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateBranch(node.id, { position: node.position });
    },
    [updateBranch]
  );

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        fitView={false}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#2E2E45"
          gap={28}
          size={1.5}
        />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as { color?: string };
            return data?.color ?? '#8B5CF6';
          }}
          maskColor="rgba(13,13,18,0.85)"
          style={{ bottom: 16, right: 16, borderRadius: 12 }}
          pannable
          zoomable
        />
        <CanvasToolbar />
      </ReactFlow>
      <BranchPreviewPopup />
    </div>
  );
}

export function ProjectCanvas() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
