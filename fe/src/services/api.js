import axios from "axios";


// Testing var
export const defaultServers = [
  // { serverIP: '127.0.0.1:7000', endpoint: '/submit-data' },
  { serverIP: '127.0.0.1:7000', endpoint: '/ics/taskOrder/addTask' },
  { serverIP: '127.0.0.1:7000', endpoint: '/ics/out/endTask ' }
];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://192.168.1.6:8001",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Send payload to a list of servers/endpoints.
// Returns an array of result objects: { success, serverIP, endpoint, error? }
export async function sendData(
  payload,
  _unused1,
  _unused2,
  _unused3,
  servers,
  _serverIPs
) {
  const results = await Promise.all(
    (servers || []).map(async (srv) => {
      const endpoint = (srv.endpoint || "").trim();
      const url = `http://${srv.serverIP}${endpoint}`;
      try {
        const response = await axios.post(url, payload, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        });
        const ok = response.status >= 200 && response.status < 300;
        return { success: ok, serverIP: srv.serverIP, endpoint };
      } catch (err) {
        return {
          success: false,
          serverIP: srv.serverIP,
          endpoint,
          error: err?.message || "Request failed",
        };
      }
    })
  );
  return results;
}