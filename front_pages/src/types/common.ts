export type Option<T extends string = string> = {
  label: string;
  value: T;
};

export type Level = "excellent" | "good" | "normal" | "weak";
