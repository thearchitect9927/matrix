export type SourceType = 'local' | 'remote';

export interface Matrix {
  id: string;
  name: string;
  repositories: RepositoryRef[];
  created_at: string;
  updated_at: string;
}

export interface RepositoryRef {
  name: string;
  url: string;
}

export interface Source {
  id: string;
  name: string;
  path: string;
  url: string | null;
  source_type: SourceType;
  created_at: string;
}

export interface MatrixCreateData {
  name: string;
}

export interface SourceAddData {
  matrixId: string;
  name: string;
  url: string;
}
