import { describe, it, expect } from 'vitest';
import type { Blueprint, BlueprintFeature, MergeRecord, MergePlanStep } from '@/types/blueprint';
import {
  createTestBlueprint,
  createTestFeature,
  createTestMergeRecord,
  createTestMergePlanStep,
} from '@/test/factories';

describe('Blueprint types', () => {
  describe('Blueprint', () => {
    it('can be created with all required fields', () => {
      const blueprint: Blueprint = createTestBlueprint();

      expect(blueprint.title).toBeDefined();
      expect(blueprint.summary).toBeDefined();
      expect(blueprint.purpose).toBeDefined();
      expect(blueprint.techStack).toBeInstanceOf(Array);
      expect(blueprint.fileStructure).toBeInstanceOf(Array);
      expect(blueprint.features).toBeInstanceOf(Array);
      expect(typeof blueprint.designTokens).toBe('object');
      expect(blueprint.changeHistory).toBeInstanceOf(Array);
      expect(typeof blueprint.raw).toBe('string');
    });

    it('supports optional parent relationship', () => {
      const withParent: Blueprint = createTestBlueprint({
        parent: { branch: 'main', relationship: 'fork' },
      });
      expect(withParent.parent).toEqual({ branch: 'main', relationship: 'fork' });

      const withoutParent: Blueprint = createTestBlueprint({ parent: null });
      expect(withoutParent.parent).toBeNull();
    });

    it('supports optional mergeHistory array', () => {
      const record = createTestMergeRecord();
      const blueprint: Blueprint = createTestBlueprint({
        mergeHistory: [record],
      });
      expect(blueprint.mergeHistory).toHaveLength(1);
      expect(blueprint.mergeHistory![0]!.sourceId).toBe(record.sourceId);
    });

    it('supports optional generatedAt timestamp', () => {
      const blueprint: Blueprint = createTestBlueprint({
        generatedAt: 1700000000000,
      });
      expect(blueprint.generatedAt).toBe(1700000000000);
    });
  });

  describe('BlueprintFeature', () => {
    it('has required id, name, description, files, dependencies', () => {
      const feature: BlueprintFeature = createTestFeature({
        id: 'hero',
        name: 'Hero Section',
        description: 'A hero banner',
        files: ['src/Hero.tsx', 'src/hero.css'],
        dependencies: ['react'],
      });

      expect(feature.id).toBe('hero');
      expect(feature.name).toBe('Hero Section');
      expect(feature.files).toContain('src/Hero.tsx');
      expect(feature.dependencies).toContain('react');
    });

    it('supports optional visualRegion', () => {
      const feature: BlueprintFeature = createTestFeature({
        visualRegion: { selector: '.hero', label: 'Hero' },
      });
      expect(feature.visualRegion).toEqual({ selector: '.hero', label: 'Hero' });
    });
  });

  describe('MergePlanStep', () => {
    it('has action, file, description, and status fields', () => {
      const step: MergePlanStep = createTestMergePlanStep({
        action: 'create',
        file: 'src/NewComponent.tsx',
        description: 'Create new component',
        status: 'pending',
      });

      expect(step.action).toBe('create');
      expect(step.file).toBe('src/NewComponent.tsx');
      expect(step.status).toBe('pending');
    });

    it('action accepts all valid values', () => {
      const actions: MergePlanStep['action'][] = ['copy', 'modify', 'create', 'delete'];
      actions.forEach((action) => {
        const step = createTestMergePlanStep({ action });
        expect(step.action).toBe(action);
      });
    });

    it('status accepts all valid values', () => {
      const statuses: MergePlanStep['status'][] = ['pending', 'done', 'failed'];
      statuses.forEach((status) => {
        const step = createTestMergePlanStep({ status });
        expect(step.status).toBe(status);
      });
    });
  });

  describe('MergeRecord', () => {
    it('has all required fields for merge audit trail', () => {
      const record: MergeRecord = createTestMergeRecord({
        sourceId: 'branch_a',
        sourceName: 'Feature A',
        targetId: 'branch_b',
        targetName: 'Main',
        featuresMigrated: ['hero', 'footer'],
        conflictsResolved: ['layout conflict -> kept source'],
      });

      expect(record.sourceId).toBe('branch_a');
      expect(record.targetId).toBe('branch_b');
      expect(record.featuresMigrated).toHaveLength(2);
      expect(record.conflictsResolved).toHaveLength(1);
      expect(record.mergePlan).toBeDefined();
      expect(typeof record.timestamp).toBe('number');
    });
  });
});
