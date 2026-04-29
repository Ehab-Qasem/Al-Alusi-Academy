import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question, Subject, UserRole } from "../types";

// NOTE: In a real production app, API calls should be proxied through a backend
// to protect the API key. For this demo, we use it directly.
const API_KEY = process.env.API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

try {
  if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
} catch (e) {
  console.warn("AI Client initialization failed", e);
}

export const aiService = {

  async chat(message: string, role: UserRole, context?: string): Promise<string> {
    if (!genAI) return "عذراً، خدمة الذكاء الاصطناعي غير مفعلة حالياً.";

    // Role-based system instruction
    let systemInstruction = "You are a helpful education assistant for Saudi Curriculum (Qudurat & Tahsili). Answer in Arabic.";

    if (role === UserRole.STUDENT) {
      systemInstruction += " You are a tutor. Explain concepts, suggest study plans. DO NOT give direct answers to exam questions if the user asks for 'answer key'. Encourage critical thinking.";
    } else if (role === UserRole.TEACHER || role === UserRole.ADMIN) {
      systemInstruction += " You are an administrative assistant. Help summarize data, suggest teaching strategies, and draft content.";
    }

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        // @ts-ignore - Type definition mismatch in current SDK version
        systemInstruction: systemInstruction
      });

      const result = await model.generateContent(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "حدث خطأ أثناء الاتصال بالخادم الذكي.";
    }
  },

  async generateQuestions(subject: string, count: number, topic: string): Promise<Partial<Question>[]> {
    if (!genAI) throw new Error("AI Service unavailable");

    const prompt = `Generate ${count} multiple choice questions for Saudi Curriculum ${subject} about "${topic}".
    Format the output as a strictly valid JSON array of objects. 
    Each object must have: 'text' (string), 'options' (array of 4 strings), 'correctOption' (number 0-3), 'explanation' (string), 'difficulty' ('easy', 'medium', 'hard').
    Do not include markdown formatting like \`\`\`json. Just the raw JSON.
    Language: Arabic.`;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          // @ts-ignore
          responseMimeType: "application/json",
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text() || "[]";
      return JSON.parse(text);
    } catch (error) {
      console.error("AI Gen Error:", error);
      return [];
    }
  }
};
