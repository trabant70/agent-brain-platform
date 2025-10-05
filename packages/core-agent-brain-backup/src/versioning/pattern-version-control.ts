import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PatternVersion {
  id: string;
  pattern_id: string;
  version: number;
  content: any;
  metadata: {
    author?: string;
    email?: string;
    timestamp: Date;
    message: string;
    tags?: string[];
    parent_version?: string;
    diff_summary?: string;
  };
  hash: string;
  size: number;
  changes: PatternChange[];
}

export interface PatternChange {
  type: 'add' | 'modify' | 'delete' | 'move';
  path: string;
  old_value?: any;
  new_value?: any;
  line_changes?: LineChange[];
}

export interface LineChange {
  type: 'add' | 'delete' | 'modify';
  line_number: number;
  old_content?: string;
  new_content?: string;
}

export interface PatternBranch {
  name: string;
  pattern_id: string;
  head_version: string;
  created_at: Date;
  created_by?: string;
  description?: string;
  merged?: boolean;
  parent_branch?: string;
}

export interface PatternMergeResult {
  success: boolean;
  new_version?: PatternVersion;
  conflicts?: PatternConflict[];
  merged_content?: any;
}

export interface PatternConflict {
  path: string;
  type: 'content' | 'metadata' | 'structure';
  base_value: any;
  source_value: any;
  target_value: any;
  resolution?: 'source' | 'target' | 'custom';
  custom_value?: any;
}

export interface PatternDiff {
  additions: number;
  deletions: number;
  modifications: number;
  changes: PatternChange[];
  similarity_score: number;
  summary: string;
}

export class PatternVersionControl {
  private dataDir: string;
  private patternsDir: string;
  private versionsDir: string;
  private branchesDir: string;
  private refsDir: string;

  constructor(dataDir: string = './data/patterns') {
    this.dataDir =dataDir;
    this.patternsDir =path?.join(dataDir, 'patterns');
    this.versionsDir =path?.join(dataDir, 'versions');
    this.branchesDir =path?.join(dataDir, 'branches');
    this.refsDir =path?.join(dataDir, 'refs');

    this?.initializeDirectories();
  }

  /**
   * Initializes version control directories
   */
  private initializeDirectories(): void {
    const dirs = [this?.dataDir, this?.patternsDir, this?.versionsDir, this?.branchesDir, this?.refsDir];

    for (const dir of dirs) {
      if (!fs?.existsSync(dir)) {
        fs?.mkdirSync(dir, { recursive: true });
      }
    }

    console?.log('✅ Pattern Version Control: Directories initialized');
  }

  /**
   * Creates a new version of a pattern
   */
  async createVersion(
    patternId: string,
    content: any,
    message: string,
    author?: { name: string; email: string },
    branch: string = 'main'
  ): Promise<PatternVersion> {
    const previousVersion = await this?.getLatestVersion(patternId, branch);
    const version = previousVersion ? previousVersion?.version + 1 : 1;

    // Calculate changes
    const changes = previousVersion
      ? this?.calculateChanges(previousVersion?.content, content)
      : [{ type: 'add' as const, path: 'root', new_value: content }];

    // Generate hash
    const hash = this?.generateHash(content, version, patternId);

    const patternVersion: PatternVersion = {
      id: `${patternId}-v${version}-${hash?.substring(0, 8)}`,
      pattern_id: patternId,
      version,
      content,
      metadata: {
        author: author?.name,
        email: author?.email,
        timestamp: new Date(),
        message,
        parent_version: previousVersion?.id,
        diff_summary: this?.generateDiffSummary(changes)
      },
      hash,
      size: JSON?.stringify(content).length,
      changes
    };

    // Save version
    await this?.saveVersion(patternVersion);

    // Update branch reference
    await this?.updateBranchRef(patternId, branch, patternVersion?.id);

    console?.log(`📝 Pattern Version Control: Created version ${version} for pattern ${patternId}`);
    return patternVersion;
  }

  /**
   * Gets the latest version of a pattern
   */
  async getLatestVersion(patternId: string, branch: string = 'main'): Promise<PatternVersion | null> {
    try {
      const branchRef = await this?.getBranchRef(patternId, branch);
      if (!branchRef) return null;

      return await this?.getVersion(branchRef);
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets a specific version by ID
   */
  async getVersion(versionId: string): Promise<PatternVersion | null> {
    try {
      const versionPath = path?.join(this?.versionsDir, `${versionId}.json`);
      if (!fs?.existsSync(versionPath)) return null;

      const data = fs?.readFileSync(versionPath, 'utf-8');
      return JSON?.parse(data);
    } catch (error) {
      console?.warn(`Failed to get version ${versionId}:`, error);
      return null;
    }
  }

  /**
   * Gets all versions for a pattern
   */
  async getVersionHistory(patternId: string, branch?: string): Promise<PatternVersion[]> {
    try {
      const versions: PatternVersion[] = [];
      let currentVersionId = branch
        ? await this?.getBranchRef(patternId, branch)
        : await this?.getBranchRef(patternId, 'main');

      while (currentVersionId) {
        const version = await this?.getVersion(currentVersionId);
        if (!version) break;

        versions?.push(version);
        currentVersionId = version?.metadata?.parent_version || null;
      }

      return versions;
    } catch (error) {
      console?.warn(`Failed to get version history for ${patternId}:`, error);
      return [];
    }
  }

  /**
   * Creates a new branch
   */
  async createBranch(
    patternId: string,
    branchName: string,
    fromBranch: string = 'main',
    description?: string,
    author?: { name: string; email: string }
  ): Promise<PatternBranch> {
    const fromVersionId = await this?.getBranchRef(patternId, fromBranch);
    if (!fromVersionId) {
      throw new Error(`Source branch '${fromBranch}' not found for pattern ${patternId}`);
    }

    const branch: PatternBranch = {
      name: branchName,
      pattern_id: patternId,
      head_version: fromVersionId,
      created_at: new Date(),
      created_by: author?.name,
      description,
      parent_branch: fromBranch
    };

    await this?.saveBranch(branch);
    await this?.updateBranchRef(patternId, branchName, fromVersionId);

    console?.log(`🌿 Pattern Version Control: Created branch '${branchName}' for pattern ${patternId}`);
    return branch;
  }

  /**
   * Merges one branch into another
   */
  async mergeBranch(
    patternId: string,
    sourceBranch: string,
    targetBranch: string,
    message: string,
    author?: { name: string; email: string },
    conflictResolutions?: Map<string, any>
  ): Promise<PatternMergeResult> {
    const sourceVersionId = await this?.getBranchRef(patternId, sourceBranch);
    const targetVersionId = await this?.getBranchRef(patternId, targetBranch);

    if (!sourceVersionId || !targetVersionId) {
      return { success: false, conflicts: [] };
    }

    const sourceVersion = await this?.getVersion(sourceVersionId);
    const targetVersion = await this?.getVersion(targetVersionId);

    if (!sourceVersion || !targetVersion) {
      return { success: false, conflicts: [] };
    }

    // Find common ancestor
    const commonAncestor = await this?.findCommonAncestor(sourceVersion, targetVersion);

    // Detect conflicts
    const conflicts = this?.detectConflicts(
      commonAncestor?.content || {},
      sourceVersion?.content,
      targetVersion?.content
    );

    if (conflicts?.length > 0 && !conflictResolutions) {
      return { success: false, conflicts };
    }

    // Merge content
    const mergedContent = this?.mergeContent(
      targetVersion?.content,
      sourceVersion?.content,
      conflicts,
      conflictResolutions
    );

    // Create merge commit
    const mergeVersion = await this?.createVersion(
      patternId,
      mergedContent,
      `Merge branch '${sourceBranch}' into '${targetBranch}': ${message}`,
      author,
      targetBranch
    );

    // Mark source branch as merged
    const sourceBranchInfo = await this?.getBranch(patternId, sourceBranch);
    if (sourceBranchInfo) {
      sourceBranchInfo.merged = true;
      await this?.saveBranch(sourceBranchInfo);
    }

    console?.log(`🔀 Pattern Version Control: Merged '${sourceBranch}' into '${targetBranch}'`);
    return { success: true, new_version: mergeVersion, merged_content: mergedContent };
  }

  /**
   * Calculates diff between two versions
   */
  async diff(patternId: string, fromVersion: string, toVersion: string): Promise<PatternDiff> {
    const fromVer = await this?.getVersion(fromVersion);
    const toVer = await this?.getVersion(toVersion);

    if (!fromVer || !toVer) {
      throw new Error('One or both versions not found');
    }

    const changes = this?.calculateChanges(fromVer?.content, toVer?.content);

    return {
      additions: changes?.filter(c => c?.type === 'add').length,
      deletions: changes?.filter(c => c?.type === 'delete').length,
      modifications: changes?.filter(c => c?.type === 'modify').length,
      changes,
      similarity_score: this?.calculateSimilarity(fromVer?.content, toVer?.content),
      summary: this?.generateDiffSummary(changes)
    };
  }

  /**
   * Reverts to a previous version
   */
  async revert(
    patternId: string,
    toVersionId: string,
    message: string,
    author?: { name: string; email: string },
    branch: string = 'main'
  ): Promise<PatternVersion> {
    const targetVersion = await this?.getVersion(toVersionId);
    if (!targetVersion) {
      throw new Error(`Version ${toVersionId} not found`);
    }

    return await this?.createVersion(
      patternId,
      targetVersion?.content,
      `Revert to version ${targetVersion?.version}: ${message}`,
      author,
      branch
    );
  }

  /**
   * Tags a version
   */
  async tagVersion(
    versionId: string,
    tagName: string,
    message?: string,
    author?: { name: string; email: string }
  ): Promise<void> {
    const version = await this?.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    if (!version?.metadata?.tags) {
      version.metadata.tags = [];
    }

    if (!version?.metadata?.tags?.includes(tagName)) {
      version?.metadata?.tags?.push(tagName);
      await this?.saveVersion(version);
    }

    // Save tag reference
    const tagRef = {
      tag: tagName,
      version_id: versionId,
      message,
      created_at: new Date(),
      created_by: author?.name
    };

    const tagPath = path?.join(this?.refsDir, 'tags', `${tagName}.json`);
    const tagDir = path?.dirname(tagPath);
    if (!fs?.existsSync(tagDir)) {
      fs?.mkdirSync(tagDir, { recursive: true });
    }

    fs?.writeFileSync(tagPath, JSON?.stringify(tagRef, null, 2));

    console?.log(`🏷️ Pattern Version Control: Tagged version ${versionId} as '${tagName}'`);
  }

  /**
   * Private helper methods
   */

  private async saveVersion(version: PatternVersion): Promise<void> {
    const versionPath = path?.join(this?.versionsDir, `${version?.id}.json`);
    fs?.writeFileSync(versionPath, JSON?.stringify(version, null, 2));
  }

  private async saveBranch(branch: PatternBranch): Promise<void> {
    const branchPath = path?.join(this?.branchesDir, `${branch?.pattern_id}-${branch?.name}.json`);
    fs?.writeFileSync(branchPath, JSON?.stringify(branch, null, 2));
  }

  private async getBranch(patternId: string, branchName: string): Promise<PatternBranch | null> {
    try {
      const branchPath = path?.join(this?.branchesDir, `${patternId}-${branchName}.json`);
      if (!fs?.existsSync(branchPath)) return null;

      const data = fs?.readFileSync(branchPath, 'utf-8');
      return JSON?.parse(data);
    } catch (error) {
      return null;
    }
  }

  private async updateBranchRef(patternId: string, branch: string, versionId: string): Promise<void> {
    const refPath = path?.join(this?.refsDir, 'heads', `${patternId}-${branch}`);
    const refDir = path?.dirname(refPath);

    if (!fs?.existsSync(refDir)) {
      fs?.mkdirSync(refDir, { recursive: true });
    }

    fs?.writeFileSync(refPath, versionId);
  }

  private async getBranchRef(patternId: string, branch: string): Promise<string | null> {
    try {
      const refPath = path?.join(this?.refsDir, 'heads', `${patternId}-${branch}`);
      if (!fs?.existsSync(refPath)) return null;

      return fs?.readFileSync(refPath, 'utf-8').trim();
    } catch (error) {
      return null;
    }
  }

  private generateHash(content: any, version: number, patternId: string): string {
    const data = JSON?.stringify({ content, version, patternId, timestamp: Date?.now() });
    return crypto?.createHash('sha256').update(data).digest('hex');
  }

  private calculateChanges(oldContent: any, newContent: any, path: string = 'root'): PatternChange[] {
    const changes: PatternChange[] = [];

    if (typeof oldContent !== typeof newContent) {
      changes?.push({
        type: 'modify',
        path,
        old_value: oldContent,
        new_value: newContent
      });
      return changes;
    }

    if (typeof oldContent === 'object' && oldContent !== null) {
      const oldKeys = new Set(Object?.keys(oldContent));
      const newKeys = new Set(Object?.keys(newContent));

      // Added keys
      for (const key of newKeys) {
        if (!oldKeys?.has(key)) {
          changes?.push({
            type: 'add',
            path: `${path}.${key}`,
            new_value: newContent[key]
          });
        }
      }

      // Deleted keys
      for (const key of oldKeys) {
        if (!newKeys?.has(key)) {
          changes?.push({
            type: 'delete',
            path: `${path}.${key}`,
            old_value: oldContent[key]
          });
        }
      }

      // Modified keys
      for (const key of oldKeys) {
        if (newKeys?.has(key)) {
          const subChanges = this?.calculateChanges(oldContent[key], newContent[key], `${path}.${key}`);
          changes?.push(...subChanges);
        }
      }
    } else if (oldContent !== newContent) {
      changes?.push({
        type: 'modify',
        path,
        old_value: oldContent,
        new_value: newContent
      });
    }

    return changes;
  }

  private generateDiffSummary(changes: PatternChange[]): string {
    const adds = changes?.filter(c => c?.type === 'add').length;
    const deletes = changes?.filter(c => c?.type === 'delete').length;
    const modifies = changes?.filter(c => c?.type === 'modify').length;

    return `+${adds} -${deletes} ~${modifies}`;
  }

  private calculateSimilarity(content1: any, content2: any): number {
    const str1 = JSON?.stringify(content1);
    const str2 = JSON?.stringify(content2);

    // Simple Jaccard similarity
    const set1 = new Set(str1?.split(''));
    const set2 = new Set(str2?.split(''));

    const intersection = new Set([...set1].filter(x => set2?.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection?.size / union?.size;
  }

  private async findCommonAncestor(version1: PatternVersion, version2: PatternVersion): Promise<PatternVersion | null> {
    const ancestors1 = new Set<string>();
    let current1: PatternVersion | null = version1;

    // Collect all ancestors of version1
    while (current1) {
      ancestors1?.add(current1?.id);
      current1 = current1?.metadata?.parent_version
        ? await this?.getVersion(current1?.metadata?.parent_version)
        : null;
    }

    // Find first common ancestor in version2's lineage
    let current2: PatternVersion | null = version2;
    while (current2) {
      if (ancestors1?.has(current2?.id)) {
        return current2;
      }
      current2 = current2?.metadata?.parent_version
        ? await this?.getVersion(current2?.metadata?.parent_version)
        : null;
    }

    return null;
  }

  private detectConflicts(base: any, source: any, target: any): PatternConflict[] {
    const conflicts: PatternConflict[] = [];

    // This is a simplified conflict detection - in practice you'd want more sophisticated logic
    const sourceChanges = this?.calculateChanges(base, source);
    const targetChanges = this?.calculateChanges(base, target);

    const conflictingPaths = new Set<string>();

    for (const sourceChange of sourceChanges) {
      for (const targetChange of targetChanges) {
        if (sourceChange?.path === targetChange?.path &&
            sourceChange?.type !== targetChange?.type) {
          conflictingPaths?.add(sourceChange?.path);
        }
      }
    }

    for (const path of conflictingPaths) {
      conflicts?.push({
        path,
        type: 'content',
        base_value: this?.getValueAtPath(base, path),
        source_value: this?.getValueAtPath(source, path),
        target_value: this?.getValueAtPath(target, path)
      });
    }

    return conflicts;
  }

  private mergeContent(
    target: any,
    source: any,
    conflicts: PatternConflict[],
    resolutions?: Map<string, any>
  ): any {
    let merged = JSON?.parse(JSON?.stringify(target));

    // Apply non-conflicting changes from source
    const sourceChanges = this?.calculateChanges(target, source);
    const conflictPaths = new Set(conflicts?.map(c => c?.path));

    for (const change of sourceChanges) {
      if (!conflictPaths?.has(change?.path)) {
        this?.setValueAtPath(merged, change?.path, change?.new_value);
      }
    }

    // Apply conflict resolutions
    if (resolutions) {
      for (const conflict of conflicts) {
        const resolution = resolutions?.get(conflict?.path);
        if (resolution !== undefined) {
          this?.setValueAtPath(merged, conflict?.path, resolution);
        }
      }
    }

    return merged;
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path?.split('.').slice(1); // Remove 'root'
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const parts = path?.split('.').slice(1); // Remove 'root'
    let current = obj;

    for (let i = 0; i < parts?.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    const lastPart = parts[parts?.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }
  }
}

export default PatternVersionControl;