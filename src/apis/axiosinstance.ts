import axios from 'axios';

const axiosInstance = axios.create({
  // baseURL: 'http://localhost:3000',
  baseURL: 'https://admin.vibecopilot.ai',

  headers: {
    'Content-Type': 'application/json',
  },
});

// Module-level overrides for public (no-localStorage) dashboards
let publicToken: string | null = "442176831c6904571c640e95b48c4bb00bc4525207afcb4e";
let publicSiteId: string | number | null = null;

export function setPublicAuth(token: string | null, siteId: string | number | null) {
  publicToken = token ? String(token).replace(/^"|"$/g, '') : "442176831c6904571c640e95b48c4bb00bc4525207afcb4e";
  publicSiteId = siteId ?? null;
}

export function clearPublicAuth() {
  publicToken = "442176831c6904571c640e95b48c4bb00bc4525207afcb4e";
  publicSiteId = null;
}

axiosInstance.interceptors.request.use((config) => {
  // Prefer module-level public auth when present (used for incognito/public dashboards)
  const developmentToken = import.meta.env.DEV ? import.meta.env.VITE_DEV_API_TOKEN : null;
  const configuredToken = publicToken || developmentToken;
  const token = configuredToken || localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (token && config.headers) {
    (config.headers as Record<string, any>)['Authorization'] = `${token}`;
  }

  // Ensure site_id and token are passed as query params for APIs that expect them
  const params = (config.params as Record<string, any>) || {};
  if (token) params.token = token;
  if (publicSiteId) params.site_id = publicSiteId;
  config.params = params;

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
