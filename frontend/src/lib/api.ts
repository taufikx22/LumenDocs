const isElectron = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return (
    w.location?.protocol === "file:" ||
    !!w.process ||
    (w.navigator && w.navigator.userAgent?.toLowerCase().includes("electron"))
  );
};

export const getApiUrl = (endpoint: string): string => {
  const base = isElectron() ? "http://localhost:8000" : "/api/rag";
  
  // Custom mapping for browse endpoint which has a different backend route
  if (endpoint === "/browse" || endpoint.startsWith("/browse?")) {
    const query = endpoint.includes("?") ? endpoint.substring(endpoint.indexOf("?")) : "";
    return isElectron() 
      ? `http://localhost:8000/setup/browse${query}` 
      : `/api/rag/browse${query}`;
  }
  
  return `${base}${endpoint}`;
};
