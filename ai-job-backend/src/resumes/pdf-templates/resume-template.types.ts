export type BasicInfo = {
  name?: string;
  phone?: string;
  email?: string;
};

export type WorkExperience = {
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type ProjectExperience = {
  name?: string;
  description?: string;
};

export type Education = {
  school?: string;
  major?: string;
  degree?: string;
};

export type ResumePdfContent = {
  basicInfo?: BasicInfo;
  summary?: string;
  skills?: string[];
  workExperiences?: WorkExperience[];
  projects?: ProjectExperience[];
  educations?: Education[];
};

export type ResumePdfTemplate = 'classic' | 'modern' | 'sidebar' | 'kendall' | 'even';

export type ResumeTemplateContext = {
  title: string;
  resume: ResumePdfContent;
};
