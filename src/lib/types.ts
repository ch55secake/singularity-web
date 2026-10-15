// Shapes returned by the platform read API. See API.md.

export type Team = 0 | 1;

export interface Hero {
  id: number;
  name: string;
  icon: string | null;
  card: string | null;
}

export interface Member {
  name: string;
}

export interface PlayerSummary {
  slot: number;
  team: Team;
  member: Member | null;
  hero: Hero;
  kills: number;
  deaths: number;
  assists: number;
}

export interface MatchSummary {
  uuid: string;
  match_id: number;
  start_time: number;
  duration_s: number;
  mode: string;
  winning_team: Team;
  players: PlayerSummary[];
}

export interface DamageSource {
  source: string;
  name: string;
  kind: "weapon" | "melee" | "ability" | "upgrade" | string;
  icon: string | null;
  total: number;
  /** Damage dealt to each enemy, keyed by player slot. */
  by_target: Record<string, number>;
}

export interface BuildEntry {
  t: number;
  id: number;
  name: string;
  kind: "item" | "ability";
  tier: number | null;
  icon: string | null;
  sold_t: number | null;
}

export interface Player extends PlayerSummary {
  souls: number;
  last_hits: number;
  denies: number;
  level: number;
  hero_damage: number;
  healing: number;
  damage_taken: number;
  damage_mitigated: number;
  aim: { shots_hit: number; shots_missed: number; hero_hits: number; hero_crits: number };
  kill_types: { bullet: number; ability: number; melee: number; headshot: number };
  timeline: { t: number[]; souls: number[]; hero_damage: number[] };
  damage_by_source: DamageSource[];
  build: BuildEntry[];
}

export interface Death {
  t: number;
  victim: number;
  killer: number;
  victim_pos: [number, number];
  killer_pos: [number, number];
  time_to_kill_s: number;
}

export interface Path {
  x: number[];
  y: number[];
  /** 0 while the player is dead. */
  health: number[];
}

export interface MatchDetail {
  uuid: string;
  match_id: number;
  start_time: number;
  duration_s: number;
  mode: string;
  winning_team: Team;
  average_badge: [number | null, number | null];
  players: Player[];
  deaths: Death[];
  paths: { interval_s: number; players: Record<string, Path> };
  map: { radius: number; image: string };
}

export interface PlayerHeroAverage {
  id: number;
  name: string;
  matches: number;
}

export interface RecentPlayerMatch {
  uuid: string;
  match_id: number;
  start_time: number;
  duration_s: number;
  winning_team: Team;
  team: Team;
  hero: Hero;
  kills: number;
  deaths: number;
  assists: number;
}

export interface PlayerAverage {
  name: string;
  matches: number;
  kdr: number;
  kda: number;
  accuracy: number;
  crit_rate: number;
  win_rate: number;
  damage_per_minute: number;
  heroes: PlayerHeroAverage[];
  recent: RecentPlayerMatch[];
}
