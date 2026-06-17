import axios from "axios";

const BASE_URL =
    "http://localhost:5000/api/boards";

const getAuthConfig = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
});



export const createBoard = (title) =>
    axios.post(BASE_URL, { title }, getAuthConfig());

export const getBoard = (id) =>
    axios.get(`${BASE_URL}/${id}`, getAuthConfig());

export const updateBoard = (
    id,
    title,
    elements
) =>
    axios.put(`${BASE_URL}/${id}`, {
        title,
        elements,
    }, getAuthConfig());

export const deleteBoard = (id) =>
    axios.delete(`${BASE_URL}/${id}`, getAuthConfig());

export const getBoards = () =>
    axios.get(
        BASE_URL,
        getAuthConfig()
);


export const inviteMember = (
  boardId,
  email
) =>
  axios.post(
    `${BASE_URL}/${boardId}/invite`,
    { email },
    getAuthConfig()
  );