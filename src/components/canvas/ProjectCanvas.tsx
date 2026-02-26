import { useEffect, useCallback, useRef } from 'react';
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
import { useUIStore } from '@/store/useUIStore';
import { BranchNode } from './BranchNode';
import { BranchEdge } from './BranchEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { BranchPreviewPopup } from './BranchPreviewPopup';

const nodeTypes: NodeTypes = { branchNode: BranchNode as NodeTypes[string] };
const edgeTypes: EdgeTypes = { branchEdge: BranchEdge as EdgeTypes[string] };

// Node bounding box dimensions (must match BranchNode constants)
const NODE_W = 240;
const NODE_H = 166; // approximate card height without hover chip

function getCenter(pos: { x: number; y: number }) {
  return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 };
}

function FlowInner() {
  const { nodes: storeNodes, edges } = useBranchTree();
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const openModal = useUIStore((s) => s.openModal);
  const { fitViewTrigger, setViewport, blendTargetId, setBlendTarget } = useCanvasStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);

  // Stores the position of the node before dragging, so we can snap it back if a blend is triggered
  const dragOriginalPosRef = useRef<{ x: number; y: number } | null>(null);

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

  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    dragOriginalPosRef.current = { ...node.position };
  }, []);

  // During drag: detect if the dragged node is overlapping another node
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const dragCenter = getCenter(node.position);
      const overlap = nodes.find((n) => {
        if (n.id === node.id) return false;
        const nCenter = getCenter(n.position);
        const dist = Math.sqrt(
          (dragCenter.x - nCenter.x) ** 2 + (dragCenter.y - nCenter.y) ** 2
        );
        return dist < NODE_W * 0.75;
      });
      setBlendTarget(overlap?.id ?? null);
    },
    [nodes, setBlendTarget]
  );

  // On drop: if overlapping another node, snap back and open blend confirmation
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (blendTargetId && blendTargetId !== node.id) {
        // Snap dragged node back to its original position
        const originalPos = dragOriginalPosRef.current;
        if (originalPos) {
          setNodes((prev) =>
            prev.map((n) => (n.id === node.id ? { ...n, position: originalPos } : n))
          );
        }
        setBlendTarget(null);
        openModal('merge', { sourceId: node.id, targetId: blendTargetId });
      } else {
        setBlendTarget(null);
        updateBranch(node.id, { position: node.position });
      }
    },
    [blendTargetId, setBlendTarget, setNodes, updateBranch, openModal]
  );

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
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
