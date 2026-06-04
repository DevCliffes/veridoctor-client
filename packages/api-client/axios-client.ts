import axios from "axios";

/**
 * axios instance for client components
 *
 */
const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.status === 403
    ) {
      window.location.href = "/auth/login"; //get user type from local storage and then redirect to the login page there
    }
    return Promise.reject(error);
  },
);

export { axiosClient };
