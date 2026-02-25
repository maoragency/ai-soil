export interface SoilLayer {
  id: string;
  depthFrom: number;
  depthTo: number;
  description: string;
  uscs: string;
  // Daya specific parameters
  finePercent?: string;   // דקים %
  plasticity?: string;    // פלסטיות
  swelling?: string;      // פוטנציאל תפיחה
  colorText?: string;     // צבע
  color?: string;         // Visual hex color
  pattern?: 'dots' | 'diagonal' | 'circles' | 'solid' | 'none';
}

export interface SPTRecord {
  id: string;
  depth: number;
  value: number;
  notes?: string;
}

export interface HeaderData {
  projectName: string; 
  boreholeName: string;
  date: string; 
  elevation: string; 
  coordinates: string; 
  client: string; 
  waterTable: string; 
}

export interface ExtractedData {
  internalId: string;
  header: HeaderData;
  layers: SoilLayer[];
  spt: SPTRecord[];
}

export interface ProjectMetadata {
  projectName: string;
  boreholeName: string;
  waterTableDepth: number;
}

export type AppStage = 'upload' | 'validation' | 'result';