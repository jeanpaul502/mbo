export interface SdkCommandDescriptor {
  name: string;
  description: string;
}

export function defineSdkCommand(name: string, description: string): SdkCommandDescriptor {
  return { name, description };
}
