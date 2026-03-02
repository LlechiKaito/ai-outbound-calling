const apiClient = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true,
});

async function apiFetch(path) {
  const res = await apiClient.get(path);
  return res.data;
}

async function apiPost(path, body) {
  const res = await apiClient.post(path, body);
  return res.data;
}

async function apiPut(path, body) {
  const res = await apiClient.put(path, body);
  return res.data;
}
