export const CONFIG = {
  ACS_BASE_URL:
    (import.meta.env?.VITE_ACS_URL_GH as string | undefined)?.replace(
      /\$/,
      ""
    ) || "http://localhost:8001",
};
