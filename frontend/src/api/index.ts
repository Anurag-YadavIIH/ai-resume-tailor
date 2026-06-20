import axios from "axios";
import type {
  ChatMessage,
  CompareResult,
  JobDescription,
  MasterResume,
  ResumeContent,
  TailoredResume,
  TailoredResumeSummary,
  TailorMatchResult,
  TailorReuseSuggestion,
  UserProfile,
} from "../types";

const api = axios.create({ baseURL: "/api" });

export const resumeApi = {
  uploadFile: async (file: File, label?: string, profileId?: string): Promise<MasterResume> => {
    const form = new FormData();
    form.append("file", file);
    if (label) form.append("label", label);
    if (profileId) form.append("profileId", profileId);
    const { data } = await api.post("/resumes/upload", form);
    return data;
  },
  uploadText: async (rawText: string, label?: string, profileId?: string): Promise<MasterResume> => {
    const { data } = await api.post("/resumes/text", { rawText, label, profileId });
    return data;
  },
  list: async (profileId?: string): Promise<MasterResume[]> =>
    (await api.get("/resumes", { params: profileId ? { profileId } : {} })).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/resumes/${id}`);
  },
};

export const jobApi = {
  ingest: async (source: "text" | "url", content: string): Promise<JobDescription> => {
    const { data } = await api.post("/jobs", { source, content });
    return data;
  },
};

export interface ChatResult {
  reply: string;
  content: ResumeContent;
  latexSource: string;
  chatHistory: ChatMessage[];
}

export const tailorApi = {
  tailor: async (
    masterResumeId: string,
    jobDescriptionId: string,
    tone = "professional",
    profileId?: string
  ): Promise<TailoredResume> => {
    const { data } = await api.post("/tailor", {
      masterResumeId,
      jobDescriptionId,
      tone,
      profileId: profileId ?? null,
    });
    return data;
  },
  updateContent: async (id: string, content: ResumeContent): Promise<TailoredResume> => {
    const { data } = await api.put(`/tailor/${id}/content`, content);
    return data;
  },
  saveLatex: async (id: string, latex: string): Promise<TailoredResume> => {
    const { data } = await api.patch(`/tailor/${id}/latex`, { latex });
    return data;
  },
  chat: async (id: string, message: string, content: ResumeContent): Promise<ChatResult> => {
    const { data } = await api.post(`/tailor/${id}/chat`, { message, content });
    return data;
  },
  get: async (id: string): Promise<TailoredResume> => (await api.get(`/tailor/${id}`)).data,
  list: async (profileId: string): Promise<TailoredResumeSummary[]> =>
    (await api.get("/tailor", { params: { profileId } })).data,
  suggestions: async (profileId: string, jobDescriptionId: string): Promise<TailorReuseSuggestion[]> =>
    (await api.get("/tailor/suggestions", { params: { profileId, jobDescriptionId } })).data,
  compare: async (id: string, source: "text" | "url", content: string): Promise<CompareResult> => {
    const { data } = await api.post(`/tailor/${id}/compare`, { source, content });
    return data;
  },
  matchAcrossResumes: async (
    profileId: string,
    source: "text" | "url",
    content: string
  ): Promise<TailorMatchResult[]> => {
    const { data } = await api.post("/tailor/match", { source, content }, { params: { profileId } });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/tailor/${id}`);
  },
};

export const profileApi = {
  get: async (id: string): Promise<UserProfile> => (await api.get(`/profile/${id}`)).data,
  save: async (id: string, profile: Partial<Omit<UserProfile, "id" | "googleLinked">>): Promise<UserProfile> => {
    const { data } = await api.put(`/profile/${id}`, profile);
    return data;
  },
  googleLogin: async (credential: string, profileId: string): Promise<UserProfile> => {
    const { data } = await api.post("/auth/google", { credential, profileId });
    return data;
  },
};

export const documentApi = {
  pdfUrl: (tailoredId: string) => `/api/documents/${tailoredId}/pdf`,
  downloadUrl: (tailoredId: string) => `/api/documents/${tailoredId}/pdf/download`,
  latexUrl: (tailoredId: string) => `/api/documents/${tailoredId}/latex`,
  coverLetter: async (tailoredId: string): Promise<string> =>
    (await api.post(`/documents/${tailoredId}/cover-letter`)).data.coverLetter,
  recruiterEmail: async (tailoredId: string): Promise<string> =>
    (await api.post(`/documents/${tailoredId}/recruiter-email`)).data.recruiterEmail,
};

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? err.message;
  }
  return "Something went wrong.";
}
