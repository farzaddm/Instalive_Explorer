import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";

const sendHttp = async ({
  endpoint,
  method = "GET",
  body = null,
  headers = {},
}) => {
  try {
    const response = await axios({
      url: `${endpoint}`,
      method,
      data: body,
      headers,
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};
const getHeaders = () => {
  const token = sessionStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "x-role": "user",
  };
};

export const useLogin = () =>
  useQuery({
    queryKey: ["login"],
    queryFn: () =>
      sendHttp({
        endpoint: "/api/v1/profile",
        headers: getHeaders(),
        method: "GET",
      }),
  });

export const useLive = () =>
  useQuery({
    queryKey: ["all-live"],
    enabled: false,
    queryFn: () =>
      sendHttp({
        endpoint: "/api/v1/all-live",
        headers: getHeaders(),
        method: "GET",
      }),
  });

export const useAddItem = () =>
  useMutation({
    mutationFn: (body) => {
      console.log(body, "body");
      return sendHttp({
        endpoint: "/api//page-relation",
        method: "PUT",
        headers: getHeaders(),
        body,
      });
    },
  });

export const useNewToken = () =>
  useQuery({
    enabled: false,
    queryKey: ["token"],
    queryFn: () =>
      sendHttp({ endpoint: "/api/v1/new-token", headers: getHeaders() }),
  });

export const useLiveLike = () =>
  useMutation({
    mutationFn: (body) =>
      sendHttp({
        endpoint: "/api/v1/like-live",
        method: "PUT",
        headers: getHeaders(),
        body,
      }),
  });

export const useLoveList = () =>
  useQuery({
    enabled: false,
    // queryKey: ["love-list"],
    queryFn: () =>
      sendHttp({ endpoint: "/api/v1/love-list", headers: getHeaders() }),
  });

export const useHateList = () =>
  useQuery({
    enabled: false,
    // queryKey: ["hate-list"],
    queryFn: () =>
      sendHttp({ endpoint: "/api/v1/hate-list", headers: getHeaders() }),
  });

export const usePublicLive = () =>
  useQuery({
    enabled: false,
    queryKey: ["public-live"],
    queryFn: () =>
      sendHttp({ endpoint: "/api/v1/public-live", headers: getHeaders() }),
  });

export const usePrivateLive = () =>
  useQuery({
    enabled: false,
    queryKey: ["private-all"],
    queryFn: () =>
      sendHttp({ endpoint: "/api/v1/private-live", headers: getHeaders() }),
  });

export default sendHttp;
