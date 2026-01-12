import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

/**
 * Transforms a raw receipt description into a professional CAR (Challenge, Action, Result) statement.
 */
export const generateCARStatement = async (description: string, tags: string[]): Promise<string> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return `[AI Mode Disabled] ${description}`;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Task: Transform a short "interaction proof" into a single, high-impact professional bullet point for a resume.
            Framework: Use the CAR (Challenge, Action, Result) framework.
            Input Description: "${description}"
            Tags: ${tags.join(', ')}

            Rules:
            1. Response must be ONE sentence or a single high-impact bullet.
            2. Start with a strong action verb.
            3. Quantify results if possible (even if you have to infer impact from context).
            4. Tone: Professional, ambitious, and concise.
            5. Do NOT include "Challenge:", "Action:", or "Result:" labels. Just the final statement.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();

    } catch (error) {
        console.error("Gemini AI Error:", error);
        return description; // Fallback to raw description
    }
};
