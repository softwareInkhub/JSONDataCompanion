import { apiRequest } from "./queryClient";

export async function generateFromPrompt(prompt: string) {
  const res = await apiRequest("POST", "/api/generate", { prompt });
  return res.json();
}

export async function generateFromFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error("Failed to upload file");
  }

  return res.json();
}
