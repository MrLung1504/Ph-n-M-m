import { GoogleGenAI, Type } from "@google/genai";
import { ExamConfig, Question, QuestionType, CognitiveLevel, cognitiveLevelLabels } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateExam = async (
    sourceText: string, 
    config: ExamConfig, 
    images: { data: string; mimeType: string; }[],
    language: string
): Promise<Question[]> => {
    const activeQuestionTypes = Object.entries(config)
        .flatMap(([type, levels]) =>
            Object.entries(levels)
                .filter(([key, value]) => key !== 'settings' && typeof value === 'number' && value > 0)
                .map(([level, count]) => `${count} ${type} question(s) at the '${level}' cognitive level`)
        )
        .join(', ');
    
    if (!activeQuestionTypes) {
        throw new Error("Vui lòng chọn số lượng câu hỏi để tạo.");
    }
    
    if (!sourceText.trim() && images.length === 0) {
        throw new Error("Nội dung nguồn hoặc hình ảnh không được để trống.");
    }

    const languageMap: { [key: string]: string } = {
        vietnamese: 'Vietnamese',
        english: 'English',
        french: 'French',
    };
    const targetLanguageName = languageMap[language] || 'Vietnamese';

    const matchingSettings = config[QuestionType.Matching].settings?.levelSettings;
    const matchingLevelRules: string[] = [];
    let matchingItemCountRules = "Each column must have between 2 and 5 items.";
    if (matchingSettings) {
        (Object.keys(matchingSettings) as CognitiveLevel[]).forEach(level => {
            const levelQuestionCount = config[QuestionType.Matching][level];
            if (levelQuestionCount > 0) {
                const itemCount = matchingSettings[level]?.itemCount || 4;
                matchingLevelRules.push(`- For any 'matching' question at the '${level}' level, each of the two columns MUST have exactly ${itemCount} items to form ${itemCount} matching pairs.`);
            }
        });
        if (matchingLevelRules.length > 0) {
            matchingItemCountRules = `Follow these per-level item count rules:\n${matchingLevelRules.join('\n')}`;
        }
    }
    
    const prompt = `
    You are an expert AI assistant that creates exams in ${targetLanguageName} from source material.
    Your task is to generate a JSON array of question objects based on the provided source text, images, and configuration.
    Configuration: ${activeQuestionTypes}.

    Source Text:
    ---
    ${sourceText}
    ---

    CRITICAL RULES - FOLLOW THESE EXACTLY OR THE TASK FAILS:
    1.  **${targetLanguageName.toUpperCase()} ONLY**: All generated text MUST be in ${targetLanguageName}.
    2.  **VALID JSON**: The output MUST be a single, valid JSON array that conforms to the provided schema. No other text or markdown is allowed.
    3.  **ANSWERS ARE MANDATORY**: This is the most important rule. Every single question object you generate MUST have a correct answer in the format specified by the schema. Generating a question without its required answer field(s) is a critical failure.
        - **For 'multiple-choice'**: The 'answer' field is REQUIRED. It must contain the exact text of the correct option.
        - **For 'true-false'**: Each object in the 'statements' array MUST have a boolean 'answer' field.
        - **For 'ordering'**: The 'items', 'correctOrder', and 'answer' fields are ALL REQUIRED.
        - **For 'matching'**: The 'answerKey' field is REQUIRED.
        - **For 'short-answer', 'fill-in-the-blank', 'essay'**: The 'answer' field is REQUIRED.
    4.  **LEVELS**: Every question object MUST have a 'level' field with one of these exact values: 'knowledge', 'comprehension', 'application', 'high-application'.
    5.  **IMAGES**: If images are provided, create questions that directly reference their content.

    QUESTION TYPE SPECIFICATIONS:

    -   **General Rules for All Questions**:
        *   The question stem must be clear, providing specific direction.
        *   If a question contains negation (e.g., "NOT", "INCORRECT", "KHÔNG"), the negative word MUST be capitalized for emphasis.
        *   Each option or statement should end with a period (.).

    -   **multiple-choice (Trắc nghiệm)**:
        1.  **Stem Focus**: The question stem should be a complete question or a sentence to be completed. Avoid overly simple stems like "Which of the following is true?".
        2.  **Homogeneous Options**: ALL 4 options MUST be grammatically parallel (e.g., all start with a noun, or all start with a verb phrase). They must also be similar in length and structure. This is a critical rule.
        3.  **No Repetition in Options**: If a phrase is repeated at the beginning of all options, move that common phrase into the question stem.
        4.  **Plausible Distractors**: The three incorrect options (distractors) must be plausible and based on common misconceptions, but clearly wrong.
        5.  **Forbidden Options**: Absolutely NO options like "All of the above", "None of the above", or "A and C are correct".
        6.  **Answer Length**: To ensure fairness, it is CRITICAL that all four options have a very similar number of characters. Avoid making any option, especially the correct answer, noticeably longer or shorter than the others.

    -   **true-false (Đúng / Sai)**:
        1.  **Scenario-Based**: The main 'question' field should describe a context or a brief scenario.
        2.  **Single-Idea Statements**: Each of the 4 statements in the 'statements' array MUST test a single, indivisible fact or concept (đơn trị). Do NOT use conjunctions like 'and' or 'or' to combine multiple ideas in one statement.
            -   **CORRECT (Single-idea)**: "The flag is drawn using the rectangle tool."
            -   **INCORRECT (Multi-idea)**: "The flag is drawn using the rectangle tool and the text is created with the text tool."
        3.  **Cognitive Progression**: The 4 statements should ideally be ordered by increasing cognitive difficulty if possible.

    -   **ordering**: The question should be a sentence scramble task.
    -   **matching**: ${matchingItemCountRules}

    **FINAL VALIDATION**: Before outputting the JSON, review every question object. Confirm that each one has its mandatory answer field(s) filled correctly according to the schema. Do not submit incomplete work.
    `;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            oneOf: [
                // 1. Multiple Choice Schema
                {
                    type: Type.OBJECT,
                    title: "Multiple Choice Question",
                    properties: {
                        type: { type: Type.STRING, enum: [QuestionType.MultipleChoice] },
                        question: { type: Type.STRING },
                        level: { type: Type.STRING, enum: Object.values(CognitiveLevel) },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        answer: { type: Type.STRING, description: "MANDATORY. Must be an exact match to one of the options." }
                    },
                    required: ['type', 'question', 'level', 'options', 'answer']
                },
                // 2. True/False Schema
                {
                    type: Type.OBJECT,
                    title: "True/False Question",
                    properties: {
                        type: { type: Type.STRING, enum: [QuestionType.TrueFalse] },
                        question: { type: Type.STRING },
                        level: { type: Type.STRING, enum: Object.values(CognitiveLevel) },
                        statements: {
                            type: Type.ARRAY,
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
                    required: ['type', 'question', 'level', 'statements']
                },
                // 3. Ordering Schema
                {
                    type: Type.OBJECT,
                    title: "Ordering Question",
                    properties: {
                        type: { type: Type.STRING, enum: [QuestionType.Ordering] },
                        question: { type: Type.STRING },
                        level: { type: Type.STRING, enum: Object.values(CognitiveLevel) },
                        items: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctOrder: { type: Type.ARRAY, items: { type: Type.STRING } },
                        answer: { type: Type.STRING, description: "MANDATORY. The final, correctly ordered sentence." }
                    },
                    required: ['type', 'question', 'level', 'items', 'correctOrder', 'answer']
                },
                // 4. Matching Schema
                {
                    type: Type.OBJECT,
                    title: "Matching Question",
                    properties: {
                        type: { type: Type.STRING, enum: [QuestionType.Matching] },
                        question: { type: Type.STRING },
                        level: { type: Type.STRING, enum: Object.values(CognitiveLevel) },
                        columns: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    items: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['title', 'items']
                            }
                        },
                        answerKey: {
                            type: Type.ARRAY,
                            items: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    },
                    required: ['type', 'question', 'level', 'columns', 'answerKey']
                },
                // 5. Text-based Answer Schema (ShortAnswer, FillInTheBlank, Essay)
                {
                    type: Type.OBJECT,
                    title: "Text Answer Question",
                    properties: {
                        type: { type: Type.STRING, enum: [QuestionType.ShortAnswer, QuestionType.FillInTheBlank, QuestionType.Essay] },
                        question: { type: Type.STRING },
                        level: { type: Type.STRING, enum: Object.values(CognitiveLevel) },
                        answer: { type: Type.STRING, description: "MANDATORY. The correct answer or a model answer." }
                    },
                    required: ['type', 'question', 'level', 'answer']
                }
            ]
        }
    };

    try {
        const parts: any[] = [{ text: prompt }];

        if (images.length > 0) {
            for (const image of images) {
                 parts.push({
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.data,
                    },
                });
            }
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
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
        throw new Error("Không thể tạo đề kiểm tra. Vui lòng kiểm tra console để biết thêm chi tiết.");
    }
};