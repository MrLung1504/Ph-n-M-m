import { GoogleGenAI, Type } from "@google/genai";
import { ExamConfig, Question, QuestionType, CognitiveLevel, cognitiveLevelLabels } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateExam = async (sourceText: string, config: ExamConfig): Promise<Question[]> => {
    const activeQuestionTypes = Object.entries(config)
        .flatMap(([type, levels]) =>
            Object.entries(levels)
                .filter(([, count]) => count > 0)
                .map(([level, count]) => `${count} ${type} question(s) at the '${level}' (Vietnamese: ${cognitiveLevelLabels[level as CognitiveLevel]}) cognitive level`)
        )
        .join(', ');
    
    if (!activeQuestionTypes) {
        throw new Error("Vui lòng chọn số lượng câu hỏi để tạo.");
    }
    
    if (!sourceText.trim()) {
        throw new Error("Nội dung nguồn không được để trống.");
    }

    const prompt = `
    You are an expert AI assistant designed to help teachers create exams from source material in Vietnamese.
    Based on the following source text, generate an exam with exactly this structure: ${activeQuestionTypes}.

    Source Text:
    ---
    ${sourceText}
    ---

    General Rules:
    - All questions must be in Vietnamese.
    - Each question object in the JSON response MUST include a 'level' field with one of these exact values: 'knowledge', 'comprehension', or 'application'.
    - The response MUST be a valid JSON array of question objects. Do not include any text before or after the JSON array.

    Cognitive Levels Explained:
    - 'knowledge' (Nhận Biết): Questions that require recalling facts, terms, basic concepts, and answers directly from the source text.
    - 'comprehension' (Thông Hiểu): Questions that require explaining ideas or concepts, summarizing, or interpreting information from the text.
    - 'application' (Vận Dụng): Questions that require using the information in new situations, solving problems, or applying abstract ideas to concrete situations.

    Specific Rules for Question Types:
    - For 'multiple-choice' questions: Provide exactly 4 options. One of them must be the correct answer.
    - For 'true-false' questions: Provide a main question prompt and exactly 4 sub-statements. Each sub-statement must have a corresponding boolean 'answer' (true or false).
    - For 'short-answer' questions: The question must require a very brief response, typically between 1 and 4 words. The 'answer' field must contain this short, precise answer.
    - For 'essay' questions: Provide a thought-provoking question based on the text and a brief 'answer' field that contains key points or a model answer outline.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                type: {
                    type: Type.STRING,
                    enum: Object.values(QuestionType),
                },
                question: {
                    type: Type.STRING,
                    description: "The main question text in Vietnamese."
                },
                level: {
                    type: Type.STRING,
                    enum: Object.values(CognitiveLevel),
                    description: "The cognitive level of the question."
                },
                answer: {
                    type: Type.STRING,
                    description: "The correct answer. Required for all types except 'true-false'."
                },
                options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of 4 strings for options. Required ONLY for 'multiple-choice' type."
                },
                statements: {
                    type: Type.ARRAY,
                    description: "An array of 4 statement objects. Required ONLY for 'true-false' type.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            statement: { type: Type.STRING },
                            answer: { type: Type.BOOLEAN }
                        },
                        required: ['statement', 'answer']
                    }
                }
            },
            required: ['type', 'question', 'level']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });

        const jsonText = response.text.trim();
        const parsedExam = JSON.parse(jsonText) as Omit<Question, 'id'>[];

        if (!Array.isArray(parsedExam)) {
             throw new Error("API did not return a valid array.");
        }

        return parsedExam.map((q) => ({ ...q, id: crypto.randomUUID() }));
    } catch (error) {
        console.error("Error generating exam with Gemini:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
             throw new Error("Lỗi khi phân tích phản hồi từ AI. Vui lòng thử lại.");
        }
        throw new Error("Không thể tạo đề thi. Vui lòng kiểm tra console để biết thêm chi tiết.");
    }
};