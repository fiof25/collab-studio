import { useEffect, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Merge } from 'lucide-react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  useNodesState,
  ReactFlowProvider,
  type Node,
  type OnMoveEnd,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useBranchTree } from '@/hooks/useBranchTree';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { BranchNode } from './BranchNode';
import { BranchEdge } from './BranchEdge';

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
  const { theme } = useThemeStore();
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const openModal = useUIStore((s) => s.openModal);
  const { fitViewTrigger, setViewport, blendTargetId, setBlendTarget } = useCanvasStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

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
        onSelectionChange={handleSelectionChange}
        panOnScroll
        zoomOnScroll
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={theme === 'dark' ? '#2E2E45' : '#C4C4D8'}
          gap={28}
          size={1.5}
        />


      </ReactFlow>
      <BranchPreviewPopup />

      {/* Multi-select blend bar */}
      <AnimatePresence>
        {selectedBranchIds.length >= 2 && (
          <motion.div
            key="multi-select-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface-1 border border-line shadow-xl pointer-events-auto">
              <span className="text-xs text-ink-secondary">
                {selectedBranchIds.length} branches selected
              </span>
              <div className="w-px h-4 bg-line" />
              <button
                onClick={handleBlendSelected}
                className="flex items-center gap-1.5 text-sm font-semibold gradient-text-blend"
              >
                <Merge size={13} />
                Blend
              </button>
            </div>
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
