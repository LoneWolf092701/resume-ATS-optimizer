
export interface Project {
  id: string;
  title: string;
  goal: string;
  technologies: string;
  outcome: string;
}

export interface ArchitectAPIResponse {
  ui_display: {
    ats_score: number;
    score_breakdown: {
      whats_missing: string[];
      what_improved: string[];
    };
  };
  pdf_data: {
    resume: {
      full_name: string;
      contact_details: {
        email: string;
        phone: string;
        linkedin: string;
        location: string;
      };
      summary: string;
      skills_list: string[];
      work_experience: {
        role: string;
        company: string;
        duration: string;
        bullet_points: string[];
      }[];
      education: {
        degree: string;
        school: string;
        year: string;
      }[];
    };
    cover_letter: {
      hiring_manager_name: string;
      company_name: string;
      body_paragraphs: string[];
    };
  };
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
