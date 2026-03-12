export interface Blueprint {
  title: string;
  summary: string;
  purpose: string;

  // Architecture — global structural overview
  architecture: {
    pattern: string;
    initFlow: string;
    stateModel: StateEntry[];
    eventModel: string[];
  };

  features: BlueprintFeature[];
  techStack: string[];
  fileStructure: FileEntry[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];
  raw: string;
  generatedAt?: number;
}

export interface StateEntry {
  name: string;
  type: string;
  scope: string;
  purpose: string;
}

export interface EntryPoint {
  type: 'function' | 'event' | 'element' | 'variable';
  name: string;
  direction: 'in' | 'out' | 'both';
  description: string;
}

export interface CodeRegion {
  file: string;
  anchor: string;
  label: string;
}

export interface FileEntry {
  path: string;
  description: string;
}

export interface BlueprintFeature {
  id: string;
  name: string;
  description: string;
  behavior: string;
  state: string[];
  entryPoints: EntryPoint[];
  codeRegions: CodeRegion[];
  files: string[];
  dependencies: string[];
  visualRegion?: {
    selector: string;
    label: string;
  };
}

export interface MergeRecord {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  featuresMigrated: string[];
  mergePlan: MergePlanStep[];
  conflictsResolved: string[];
  timestamp: number;
}

export interface MergePlanStep {
  action: 'copy' | 'modify' | 'create' | 'delete';
  file: string;
  description: string;
  status: 'pending' | 'done' | 'failed';
}
