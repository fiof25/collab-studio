import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Merge } from 'lucide-react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  useNodesState,
  useViewport,
  ReactFlowProvider,
  type Node,
  type OnMoveEnd,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeFunc,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBranchTree } from '@/hooks/useBranchTree';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { BranchNode } from './BranchNode';
import { BranchEdge } from './BranchEdge';


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
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const { x: vpX, y: vpY, zoom } = useViewport();

  // Position the blend bar at the center of the selected nodes in container coordinates
  const blendBarPos = useMemo(() => {
    if (selectedBranchIds.length < 2) return null;
    const sel = nodes.filter((n) => selectedBranchIds.includes(n.id));
    if (!sel.length) return null;
    const xs = sel.map((n) => n.position.x);
    const ys = sel.map((n) => n.position.y);
    const cx = (Math.min(...xs) + Math.max(...xs) + NODE_W) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys) + NODE_H) / 2;
    // flow → container: containerPos = flowPos * zoom + viewport offset
    return { x: cx * zoom + vpX, y: cy * zoom + vpY };
  }, [selectedBranchIds, nodes, vpX, vpY, zoom]);

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

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: sel }) => {
    setSelectedBranchIds(sel.map((n) => n.id));
  }, []);

  const handleBlendSelected = useCallback(() => {
    openModal('merge', { branchIds: selectedBranchIds });
    setNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
    setSelectedBranchIds([]);
  }, [selectedBranchIds, openModal, setNodes]);

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
        elementsSelectable={true}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        multiSelectionKeyCode={['Meta', 'Shift']}
        onSelectionChange={handleSelectionChange}
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


      </ReactFlow>
      {/* Multi-select blend bar — floats at the center of the selection */}
      <AnimatePresence>
        {blendBarPos && (
          <motion.div
            key="multi-select-bar"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute z-40 pointer-events-none"
            style={{
              left: blendBarPos.x,
              top: blendBarPos.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <button
              onClick={handleBlendSelected}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-1 border border-line shadow-xl text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
            >
              <Merge size={13} />
              Blend
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
