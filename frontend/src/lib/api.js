// frontend/src/lib/api.js
const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`;

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    // Auto-redirect to login on auth failures
    if (res.status === 401) {
      logout();
      const role = localStorage.getItem("role");
      if (role === "patient") {
        window.location.href = "/patient/login";
      } else {
        window.location.href = "/admin/login";
      }
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export function setAuth(token, user, role) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("role", role);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function getRole() {
  return localStorage.getItem("role");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function isLoggedIn() {
  const token = localStorage.getItem("token");
  if (!token) return false;

  // Check if JWT is expired client-side
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout();
      return false;
    }
    return true;
  } catch {
    logout();
    return false;
  }
}