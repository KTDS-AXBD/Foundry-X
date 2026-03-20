"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowNode, WorkflowEdge, WorkflowDefinition } from "@/lib/api-client";

// ─── Custom Node Components ───

const nodeColors: Record<string, string> = {
  trigger: "border-green-500 bg-green-500/10",
  action: "border-blue-500 bg-blue-500/10",
  condition: "border-yellow-500 bg-yellow-500/10",
  end: "border-gray-500 bg-gray-500/10",
};

function WorkflowNodeComponent({ data }: { data: { label: string; nodeType: string } }) {
  const color = nodeColors[data.nodeType] ?? nodeColors.action;
  return (
    <div className={`rounded-lg border-2 px-4 py-2 text-sm font-medium shadow-sm ${color}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      {data.label}
      {data.nodeType !== "end" && (
        <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// ─── Converters ───

function toFlowNodes(wfNodes: WorkflowNode[]): Node[] {
  return wfNodes.map((n) => ({
    id: n.id,
    type: "workflowNode",
    position: n.position,
    data: { label: n.label, nodeType: n.type, actionType: n.data.actionType, config: n.data.config },
  }));
}

function toFlowEdges(wfEdges: WorkflowEdge[]): Edge[] {
  return wfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: !!e.condition,
  }));
}

function fromFlowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data.nodeType as WorkflowNode["type"]) ?? "action",
    label: (n.data.label as string) ?? "",
    position: n.position,
    data: {
      actionType: n.data.actionType as WorkflowNode["data"]["actionType"],
      config: n.data.config as Record<string, unknown> | undefined,
    },
  }));
}

function fromFlowEdges(edges: Edge[]): WorkflowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
}

// ─── Canvas Props ───

interface Props {
  definition: WorkflowDefinition;
  onChange: (def: WorkflowDefinition) => void;
  onNodeSelect: (nodeId: string | null) => void;
}

export default function WorkflowCanvas({ definition, onChange, onNodeSelect }: Props) {
  const initialNodes = useMemo(() => toFlowNodes(definition.nodes), [definition.nodes]);
  const initialEdges = useMemo(() => toFlowEdges(definition.edges), [definition.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // defer to avoid stale closure
      setTimeout(() => {
        setNodes((curr) => {
          onChange({ nodes: fromFlowNodes(curr), edges: fromFlowEdges(edges) });
          return curr;
        });
      }, 0);
    },
    [onNodesChange, edges, onChange, setNodes],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setTimeout(() => {
        setEdges((curr) => {
          onChange({ nodes: fromFlowNodes(nodes), edges: fromFlowEdges(curr) });
          return curr;
        });
      }, 0);
    },
    [onEdgesChange, nodes, onChange, setEdges],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const next = addEdge({ ...params, id: `e-${Date.now()}` }, eds);
        onChange({ nodes: fromFlowNodes(nodes), edges: fromFlowEdges(next) });
        return next;
      });
    },
    [setEdges, nodes, onChange],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawType = event.dataTransfer.getData("application/reactflow-type");
      const label = event.dataTransfer.getData("application/reactflow-label");
      if (!rawType) return;

      const nodeType = rawType.startsWith("action:") ? "action" : rawType;
      const actionType = rawType.startsWith("action:") ? rawType.split(":")[1] : undefined;

      const id = `node-${Date.now()}`;
      const position = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };

      const newNode: Node = {
        id,
        type: "workflowNode",
        position,
        data: { label, nodeType, actionType },
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        onChange({ nodes: fromFlowNodes(next), edges: fromFlowEdges(edges) });
        return next;
      });
    },
    [setNodes, edges, onChange],
  );

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
