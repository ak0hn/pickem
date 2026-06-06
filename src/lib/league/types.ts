export type DayOfWeek = "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | "Mon";

export type Team = {
  id: string;
  abbr: string;
  name: string;
  city: string;
  color: string;
};

export type GameSlot = "TNF" | "SUN_EARLY" | "SUN_LATE" | "SNF" | "MNF";

export type Game = {
  id: string;
  week: number;
  slot: GameSlot;
  kickoff: string;
  homeTeamId: string;
  awayTeamId: string;
  spread: number; // negative = home favored (HOME perspective)
  homeScore?: number;
  awayScore?: number;
  finalAtsWinnerTeamId?: string | null;
};

export type PickSide = "HOME" | "AWAY";

export type Pick = {
  gameId: string;
  side: PickSide;
};

export type GMEntry = {
  gmId: string;
  week: number;
  picks: Pick[];
  submittedAt?: string;
  mnfTotalGuess?: number;
};

export type GM = {
  id: string;
  handle: string;
  avatarHue: number;
  isCommissioner?: boolean;
  isYou?: boolean;
};

export type FeedItemKind =
  | "SLATE_PUBLISHED"
  | "RESULTS"
  | "STANDINGS_UPDATE"
  | "ANNOUNCEMENT"
  | "TIEBREAKER_CALL";

export type FeedComment = {
  id: string;
  gmId: string;
  body: string;
  postedAt: string;
};

export type FeedItem = {
  id: string;
  kind: FeedItemKind;
  week: number;
  postedAt: string;
  title: string;
  body?: string;
  ctaWeek?: number;
  likes?: string[];      // gmIds who liked
  comments?: FeedComment[];
};
