export interface PanelEntry {
  id: string;
  label: string;
  version: string;
  segment: (input: string) => string[];
}

export declare const segmenters: PanelEntry[];
export declare function segmenterById(id: string): PanelEntry;
