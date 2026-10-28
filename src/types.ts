export interface HistoryEvent {
  id: string;
  year: number;
  event: string;
  tags: string[];
  description: string;
}

export interface EventStat {
  correct: number;
  wrong: number;
  streak: number;
  isWeak: boolean;
}

export type StatsMap = Record<string, EventStat>;

export type GlobalGameType = 'quiz' | 'sort_era';
export type HistoryField = 'japan' | 'world' | 'mixed';
export type QuizMode = 'input' | 'choice' | 'flashcard' | 'sort' | 'same_era';
export type QuestionCount = 10 | 20 | 'all';
export type SortYearGap = 'near' | 'medium' | 'far';

export interface SameEraPair {
  jp: HistoryEvent;
  wd: HistoryEvent;
  year: number;
  exact: boolean;
}

export interface IncorrectAnswer {
  question: string;
  correct: string;
  wrong: string;
}

export interface StatSaveResult {
  wasWeak: boolean;
  isWeak: boolean;
  streak: number;
  newlyOvercome: boolean;
}

export interface StudySubject {
  id: string;
  name: string;
  color?: string;
  weeklyGoalMinutes?: number;
}
