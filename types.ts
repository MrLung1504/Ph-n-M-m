export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  TrueFalse = 'true-false',
  ShortAnswer = 'short-answer',
  Essay = 'essay',
}

export const questionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: 'Trắc nghiệm',
  [QuestionType.TrueFalse]: 'Đúng / Sai',
  [QuestionType.ShortAnswer]: 'Trả lời ngắn',
  [QuestionType.Essay]: 'Tự luận',
};

export enum CognitiveLevel {
  Knowledge = 'knowledge', // Nhận Biết
  Comprehension = 'comprehension', // Thông Hiểu
  Application = 'application', // Vận Dụng
}

export const cognitiveLevelLabels: Record<CognitiveLevel, string> = {
  [CognitiveLevel.Knowledge]: 'Nhận Biết',
  [CognitiveLevel.Comprehension]: 'Thông Hiểu',
  [CognitiveLevel.Application]: 'Vận Dụng',
};

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  level: CognitiveLevel;
  answer?: string; // Optional at base level
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: QuestionType.MultipleChoice;
  options: string[];
  answer: string; // Required for this specific type
}

export interface TrueFalseStatement {
    statement: string;
    answer: boolean;
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: QuestionType.TrueFalse;
    statements: TrueFalseStatement[];
}


export type Question = MultipleChoiceQuestion | TrueFalseQuestion | BaseQuestion;

export type ExamConfig = {
  [key in QuestionType]: {
    [level in CognitiveLevel]: number;
  };
};