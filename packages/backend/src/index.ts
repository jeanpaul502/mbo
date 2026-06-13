export const backendCapabilities = {
  httpServer: true,
  router: true,
  middleware: true,
  auth: true,
  permissions: true,
  validation: true,
  websocket: true,
  cache: true,
  queue: true,
  scheduler: true,
  logging: true,
  monitoring: true,
  storage: true,
  mail: true,
  search: true,
  events: true
};

export function createBackendKernel() {
  return {
    name: "it-backend-kernel",
    features: Object.keys(backendCapabilities).filter((feature) => backendCapabilities[feature as keyof typeof backendCapabilities])
  };
}
