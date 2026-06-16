import axios from "axios";

const BASE_URL =
  "http://localhost:5000/api/auth";

export const login = (data) =>
  axios.post(
    `${BASE_URL}/login`,
    data
  );

export const register = (data) =>
  axios.post(
    `${BASE_URL}/register`,
    data
  );

  const getAuthConfig = () => ({
  headers: {
    Authorization:
      `Bearer ${localStorage.getItem("token")}`,
  },
});

export const logout = () =>
  axios.post(
    `${BASE_URL}/logout`,
    {},
    getAuthConfig()
  );