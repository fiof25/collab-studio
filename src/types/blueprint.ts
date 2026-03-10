export interface Blueprint {
  title: string;
  summary: string;
  purpose: string;
  techStack: string[];
  fileStructure: FileEntry[];
  features: BlueprintFeature[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];
  raw: string;
  generatedAt?: number; // unix timestamp when this blueprint was generated
}

export interface FileEntry {
  path: string;
  description: string;
}

export interface BlueprintFeature {
  id: string;
  name: string;
  description: string;
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
