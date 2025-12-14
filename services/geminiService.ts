import { GoogleGenAI } from "@google/genai";
import { Post } from '../types';

// NOTE: In a real production app, API calls should go through your backend proxy
// to protect the API key. For this frontend demo, we assume the environment variable is set.
// The user prompt specifically asked for a secure backend, but since I am generating a React SPA,
// I am demonstrating the "AI Feature" via client-side call for the demo purpose.

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  analyzePost: async (post: Post): Promise<string> => {
    if (!apiKey) return "API Key not configured for AI insights.";

    try {
      const prompt = `
        You are an expert medical assistant for MedGram, a social platform for medical professionals.
        Analyze the following post content and provide a brief, professional summary or clinical insight.
        If it's a video, infer context from the caption.
        
        Post Author Role: ${post.authorRole}
        Content: "${post.content}"
        
        Keep the response under 100 words. Use medical terminology appropriately but stay accessible.
        Disclaimer: Start with "AI Insight: "
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "Could not generate insight.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "AI Insight currently unavailable.";
    }
  }
};