export enum QuestionType {
  MultipleChoice = 'multiple-choice',
  TrueFalse = 'true-false',
  ShortAnswer = 'short-answer',
  FillInTheBlank = 'fill-in-the-blank',
  Essay = 'essay',
  Ordering = 'ordering',
  Matching = 'matching',
}

export const questionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.MultipleChoice]: 'Trắc nghiệm',
  [QuestionType.TrueFalse]: 'Đúng / Sai',
  [QuestionType.ShortAnswer]: 'Trả lời ngắn',
  [QuestionType.FillInTheBlank]: 'Điền khuyết',
  [QuestionType.Essay]: 'Tự luận',
  [QuestionType.Ordering]: 'Sắp xếp',
  [QuestionType.Matching]: 'Ghép nối',
};

export enum CognitiveLevel {
  Knowledge = 'knowledge', // Nhận Biết
  Comprehension = 'comprehension', // Thông Hiểu
  Application = 'application', // Vận Dụng
  HighApplication = 'high-application', // Vận Dụng Cao
}

export const cognitiveLevelLabels: Record<CognitiveLevel, string> = {
  [CognitiveLevel.Knowledge]: 'Nhận Biết',
  [CognitiveLevel.Comprehension]: 'Thông Hiểu',
  [CognitiveLevel.Application]: 'Vận Dụng',
  [CognitiveLevel.HighApplication]: 'Vận Dụng Cao',
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

export interface OrderingQuestion extends BaseQuestion {
  type: QuestionType.Ordering;
  items: string[];
  correctOrder: string[];
}

export interface MatchingColumn {
    title: string;
    items: string[];
}

export interface MatchingQuestion extends BaseQuestion {
    type: QuestionType.Matching;
    columns: MatchingColumn[];
    answerKey: string[][]; // Each inner array is a set of matched items, one from each column in order.
}


export type Question = MultipleChoiceQuestion | TrueFalseQuestion | OrderingQuestion | MatchingQuestion | BaseQuestion;

export type ExamConfig = {
  [key in QuestionType]: {
    [level in CognitiveLevel]: number;
  } & {
    settings?: {
      levelSettings?: {
        [key in CognitiveLevel]?: {
            itemCount: number;
        }
      }
    }
  };
};