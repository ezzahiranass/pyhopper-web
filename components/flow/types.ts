export type PyhopperComponentPort = {
  name: string;
  type: string | null;
  access?: string;
  default?: unknown;
  optional?: boolean;
};

export type PyhopperComponentDefinition = {
  tab: string;
  category: string;
  component: string;
  description: string;
  frontend_preset?: string | null;
  frontend_config?: {
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    value?: number;
  } | null;
  input_count: number;
  output_count: number;
  variadic_inputs?: boolean;
  inputs: PyhopperComponentPort[];
  outputs: PyhopperComponentPort[];
};

export type ComponentNodeData = {
  definition: PyhopperComponentDefinition;
};
