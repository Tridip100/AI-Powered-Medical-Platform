import axios from 'axios';
import { ClassificationResult, RAGResponse, SymptomResult, AutoClassifyResult } from '../types';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: BASE, timeout: 30000 });
const form = (file: File) => { const fd = new FormData(); fd.append('file', file); return fd; };

export const classifyOrgan  = (file: File) => api.post<ClassificationResult>('/classify/organ',  form(file)).then(r => r.data);
export const classifyChest  = (file: File) => api.post<ClassificationResult>('/classify/chest',  form(file)).then(r => r.data);
export const classifyBrain  = (file: File) => api.post<ClassificationResult>('/classify/brain',  form(file)).then(r => r.data);
export const classifyEye    = (file: File) => api.post<ClassificationResult>('/classify/eye',    form(file)).then(r => r.data);
export const classifySkin   = (file: File) => api.post<ClassificationResult>('/classify/skin',   form(file)).then(r => r.data);
export const classifyBone   = (file: File) => api.post<ClassificationResult>('/classify/bone',   form(file)).then(r => r.data);
export const classifyKnee   = (file: File) => api.post<ClassificationResult>('/classify/knee',   form(file)).then(r => r.data);
export const classifyDental = (file: File) => api.post<ClassificationResult>('/classify/dental', form(file)).then(r => r.data);
export const autoClassify   = (file: File) => api.post<AutoClassifyResult>('/classify/auto',    form(file)).then(r => r.data);

export const getGradcam = (file: File, modelType: string) => {
  const fd = form(file); fd.append('model_type', modelType);
  return api.post<{ gradcam_image: string }>('/gradcam', fd).then(r => r.data);
};

export const askTutor      = (question: string) => api.post<RAGResponse>('/rag/ask', { question }).then(r => r.data);
export const checkSymptoms = (symptoms: string) => api.post<SymptomResult[]>('/symptoms/check', { symptoms }).then(r => r.data);

export const wikiSearch = async (query: string) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' anatomy')}&format=json&origin=*&srlimit=5`;
  const res = await fetch(url);
  const data = await res.json();
  return data.query.search;
};

export const wikiSummary = async (title: string) => {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
};
