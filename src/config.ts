export interface RawAction {
  icon: string;
  out: string;
  size: number;
}

export default interface Config {
  project?: string;
  ios?: string;
  android?: string;
  web?: string;
  macos?: string;
  windows?: string;
  raw?: RawAction[];
}
