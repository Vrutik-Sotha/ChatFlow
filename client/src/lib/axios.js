import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true, // sends cookies automatically
});

export default axiosInstance;