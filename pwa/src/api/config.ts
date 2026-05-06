const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();

// Use the local Vite proxy by default so browser requests stay same-origin.
export const API_BASE = configuredBase || '/api';
