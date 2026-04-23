export type EndingType = 'good' | 'neutral' | 'bad' | 'hidden_true' | 'hidden_ironic';

export interface EndingData {
  id: EndingType;
  name: string;
  description: string;
  condition: {
    minMorality?: number;
    maxMorality?: number;
    requiredFlags?: Record<string, boolean | number | string>;
    requiredCharacters?: string[];
    requiredItems?: string[];
    hidden?: boolean;
  };
}
