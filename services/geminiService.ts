
import { GoogleGenAI, Type } from "@google/genai";
import { ArchitectAPIResponse } from "../types";

export async function architectResumeAndLetter(resume: string, jd: string): Promise<ArchitectAPIResponse> {
  // This will work during build time with the workflow
  const apiKey = process.env.GEMINI_API_KEY || `AIzaSyDRO3_eM9eYx3Mj8D1gRw7S55L8feGCzls`;
  
  if (!apiKey) {
    throw new Error("API key not configured");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  
  const prompt = `
    You are the "Resume Architect" API. Your goal is to analyze a user's input (Resume + Optional Job Description) and return a structured JSON object used to generate a UI and a professional document suite.

    ### INPUT DATA
    [CURRENT RESUME]
    ${resume}

    [TARGET JOB DESCRIPTION]
    ${jd || "None provided. Analyze industry standard for the candidate's current role."}

    ### PROCESSING LOGIC
    1. Score & Analyze: Compare the input Resume against the Job Description. Calculate an ATS match score (0-100).
    2. Identify Gaps: List 3-5 specific hard skills or keywords missing or weak.
    3. Execute Improvements: Rewrite the resume to fix gaps and inject quantifiable metrics (Action + Context + Result).
    4. Generate Cover Letter: Create a 3-paragraph tailored cover letter.

    ### OUTPUT FORMAT (STRICT JSON ONLY)
    Return ONLY a JSON object matching the provided schema. No markdown wrapping.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ui_display: {
              type: Type.OBJECT,
              properties: {
                ats_score: { type: Type.NUMBER },
                score_breakdown: {
                  type: Type.OBJECT,
                  properties: {
                    whats_missing: { type: Type.ARRAY, items: { type: Type.STRING } },
                    what_improved: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["whats_missing", "what_improved"]
                }
              },
              required: ["ats_score", "score_breakdown"]
            },
            pdf_data: {
              type: Type.OBJECT,
              properties: {
                resume: {
                  type: Type.OBJECT,
                  properties: {
                    full_name: { type: Type.STRING },
                    contact_details: {
                      type: Type.OBJECT,
                      properties: {
                        email: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        linkedin: { type: Type.STRING },
                        location: { type: Type.STRING }
                      },
                      required: ["email", "phone", "linkedin", "location"]
                    },
                    summary: { type: Type.STRING },
                    skills_list: { type: Type.ARRAY, items: { type: Type.STRING } },
                    work_experience: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          role: { type: Type.STRING },
                          company: { type: Type.STRING },
                          duration: { type: Type.STRING },
                          bullet_points: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["role", "company", "duration", "bullet_points"]
                      }
                    },
                    education: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          degree: { type: Type.STRING },
                          school: { type: Type.STRING },
                          year: { type: Type.STRING }
                        },
                        required: ["degree", "school", "year"]
                      }
                    }
                  },
                  required: ["full_name", "contact_details", "summary", "skills_list", "work_experience", "education"]
                },
                cover_letter: {
                  type: Type.OBJECT,
                  properties: {
                    hiring_manager_name: { type: Type.STRING },
                    company_name: { type: Type.STRING },
                    body_paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["hiring_manager_name", "company_name", "body_paragraphs"]
                }
              },
              required: ["resume", "cover_letter"]
            }
          },
          required: ["ui_display", "pdf_data"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Architect Error:", error);
    throw error;
  }
}
