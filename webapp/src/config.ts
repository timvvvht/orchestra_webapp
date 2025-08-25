export const CONFIG = {
    ACS_BASE_URL: (import.meta.env?.VITE_ACS_BASE_URL as string | undefined)?.replace(/\$/, '') || 'https://orchestra-acs.fly.dev'
};
