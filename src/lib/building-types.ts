export type NodeType = "room" | "junction" | "exit";

export interface BuildingNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface BuildingEdge {
  id: string;
  from: string;
  to: string;
  cost: number;
}

export interface BuildingState {
  blocked_nodes: string[];
  blocked_edges: string[];
  closed_exits: string[];
}

export interface BuildingData {
  building: string;
  nodes: BuildingNode[];
  edges: BuildingEdge[];
  initial_state: BuildingState;
}

export interface EvacuationRoute {
  exitId: string;
  nodeIds: string[];
  edgeIds: string[];
  totalCost: number;
}
