export interface ContactLink {
  label: string;
  url: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: ContactLink[];
}

export interface ExperienceItem {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  tech: string[];
  bullets: string[];
  link: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  details: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: string;
}

export interface ResumeContent {
  contact: Contact;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  certifications?: Certification[];
}

export interface UserProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  skills: string[] | null;
  certifications: Certification[] | null;
  education: EducationItem[] | null;
  googleLinked: boolean;
}

export interface MasterResume {
  id: string;
  label: string;
  rawText: string;
  structured: ResumeContent;
  createdAt: string;
}

export interface JobRequirements {
  title: string;
  company: string;
  seniority: string;
  hardSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  keywords: string[];
  niceToHave: string[];
}

export interface JobDescription {
  id: string;
  source: string;
  sourceUrl: string | null;
  title: string;
  company: string;
  rawText: string;
  requirements: JobRequirements;
  createdAt: string;
}

export interface MissingSkill {
  skill: string;
  severity: "high" | "medium" | "low";
  mentions?: number;
  suggestion: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TailoredResumeSummary {
  id: string;
  jobTitle: string | null;
  company: string | null;
  roleCategory: string;
  masterResumeLabel: string;
  matchScore: number | null;
  atsScore: number | null;
  missingSkills: MissingSkill[];
  createdAt: string;
}

export interface TailorReuseSuggestion {
  tailoredResumeId: string;
  originalJobTitle: string | null;
  originalCompany: string | null;
  masterResumeLabel: string;
  matchScoreForNewJob: number;
  createdAt: string;
}

export interface TailorMatchResult {
  tailoredResumeId: string;
  originalJobTitle: string | null;
  originalCompany: string | null;
  roleCategory: string;
  masterResumeLabel: string;
  matchScore: number;
  missingSkills: MissingSkill[];
  createdAt: string;
}

export interface CompareResult {
  jobDescriptionId: string;
  jobTitle: string | null;
  company: string | null;
  matchScore: number;
  missingSkills: MissingSkill[];
}

export interface TailoredResume {
  id: string;
  masterResumeId: string;
  jobDescriptionId: string;
  content: ResumeContent;
  missingSkills: MissingSkill[];
  latexSource: string;
  coverLetter: string | null;
  recruiterEmail: string | null;
  matchScore: number;
  atsScore: number | null;
  createdAt: string;
  chatHistory: ChatMessage[];
}
