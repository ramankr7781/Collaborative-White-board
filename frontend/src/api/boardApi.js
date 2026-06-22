import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL}/boards`;

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const createBoard = (title) =>
  axios.post(BASE_URL, { title }, getAuthConfig());

export const getBoard = (id) =>
  axios.get(`${BASE_URL}/${id}`, getAuthConfig());

export const updateBoard = (id, title, elements) =>
  axios.put(
    `${BASE_URL}/${id}`,
    { title, elements },
    getAuthConfig()
  );

export const deleteBoard = (id) =>
  axios.delete(`${BASE_URL}/${id}`, getAuthConfig());

export const getBoards = () =>
  axios.get(BASE_URL, getAuthConfig());

export const inviteMember = (boardId, email) =>
  axios.post(
    `${BASE_URL}/${boardId}/invite`,
    { email },
    getAuthConfig()
  );

export const getAccessRequests = (boardId) =>
  axios.get(
    `${BASE_URL}/${boardId}/requests`,
    getAuthConfig()
  );

export const approveRequest = (requestId) =>
  axios.post(
    `${BASE_URL}/requests/${requestId}/approve`,
    {},
    getAuthConfig()
  );

export const requestAccess = (boardId) =>
  axios.post(
    `${BASE_URL}/${boardId}/request-access`,
    {},
    getAuthConfig()
  );

export const rejectRequest = (requestId) =>
  axios.post(
    `${BASE_URL}/requests/${requestId}/reject`,
    {},
    getAuthConfig()
  );

export const getBoardMembers = (boardId) =>
  axios.get(
    `${BASE_URL}/${boardId}/members`,
    getAuthConfig()
  );

export const removeMember = (boardId, memberId) =>
  axios.delete(
    `${BASE_URL}/${boardId}/members/${memberId}`,
    getAuthConfig()
  );