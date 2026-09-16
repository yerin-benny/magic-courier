import type { Problem, PublicProblem, Type } from '../core/problems';
import type { ItemSlot } from '../data/items';
export type Student = {
  id: string;
  schoolId: string;
  nickname: string;
  character: string;
  region: string;
  round: number;
  route: string[];
  leg: number;
  visited: string[];
  dust: number;
  ownedItems: string[];
  equippedItems: Partial<Record<ItemSlot, string>>;
  totalProblems: number;
  totalDeliveries: number;
  firstCorrect: number;
  stats: Record<Type, { total: number; first: number }>;
  recent: string[];
  activeSession: string | null;
  lastSession: string | null;
  origin?: string;
  rankingCap?: number;
  rankingDay: string;
  rankingCount: number;
  lastCompletedAt: number | null;
};
export type Submission = {
  requestId: string;
  problemId: string;
  at: number;
  result: 'wrong' | 'simplify' | 'correct';
  input: Record<string, string>;
  first: boolean;
};
export type Delivery = {
  id: string;
  owner: string;
  destination: string;
  createdAt: number;
  problems: Problem[];
  index: number;
  attempts: number[];
  history: Submission[];
  completedAt: number | null;
  ranked: boolean;
  bonusReason: string;
  dust: number;
};
export type PublicDelivery = Omit<Delivery, 'problems' | 'history'> & {
  problem: PublicProblem | null;
};
export type SchoolStats = {
  id: string;
  name: string;
  region: string;
  total: number;
  weeks: Record<string, number>;
  participants: number;
};
export type RankRow = {
  id: string;
  name: string;
  weekly: number;
  total: number;
  weeklyRank: number;
  totalRank: number;
};
export type Aggregate = {
  weekKey: string;
  updatedAt: number;
  totalSchools: number;
  top10: RankRow[];
  allTimeTop10: RankRow[];
  schools: Record<string, RankRow>;
};
export type View = {
  student: Student;
  delivery: PublicDelivery | null;
  lastDelivery: PublicDelivery | null;
};
export type Command =
  | 'state'
  | 'setup'
  | 'start'
  | 'answer'
  | 'finish'
  | 'nextRound'
  | 'buyItem'
  | 'equipItem'
  | 'leaderboard'
  | 'refreshLeaderboard';
