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

export interface ImpactScore {
  score: number;
  combat: number;
  economy: number;
  utility: number;
  survival: number;
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

export interface SessionMatch {
  uuid: string;
  match_id: number;
  start_time: number;
  duration_s: number;
  result: 'win' | 'loss' | 'split';
  members: string[];
  impact_score: number;
}

export interface MatchSession {
  start_time: number;
  end_time: number;
  duration_s: number;
  matches: SessionMatch[];
  members: string[];
  wins: number;
  losses: number;
  splits: number;
  /** Wins divided by all matches, including splits in the denominator. */
  win_rate: number;
  impact_score: number;
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
  impact: ImpactScore;
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

export interface LaneSouls {
  /** Held net worth at the snapshot, not total earned. */
  net_worth: number | null;
  player: number | null;
  player_orbs: number | null;
  lane_creeps: number | null;
  lane_creep_orbs: number | null;
  neutral_creeps: number | null;
  neutral_creep_orbs: number | null;
  boss: number | null;
  boss_orbs: number | null;
  treasure: number | null;
  denied: number | null;
  lost_on_death: number | null;
}

export interface LanePlayer {
  slot: number;
  team: Team;
  hero: Hero;
  /** Actual cumulative-stat snapshot time, at or before lane_phase_end_s. */
  snapshot_time_s: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  creep_kills: number | null;
  neutral_kills: number | null;
  denies: number | null;
  hero_damage: number | null;
  souls: LaneSouls;
}

export interface LaneDeath {
  t: number;
  victim: number;
  killer: number;
}

export interface LaneStats {
  uuid: string;
  match_id: number;
  lane_phase_end_s: number;
  players: LanePlayer[];
  deaths: LaneDeath[];
}

export interface ObjectiveEvent {
  t: number;
  /** Owning team for structures; claiming team for the mid-boss. */
  team: Team;
  kind: 'guardian' | 'walker' | 'shrine' | 'base_guardian' | 'patron' | 'patron_core' | 'mid_boss';
  position_key: string | null;
  /** World coordinates; null when the current map assets do not locate this objective. */
  position: [number, number] | null;
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
  impact_score_version: number;
  average_badge: [number | null, number | null];
  players: Player[];
  deaths: Death[];
  objectives: ObjectiveEvent[];
  paths: { interval_s: number; players: Record<string, Path> };
  map: { radius: number; image: string; objective_positions: Record<string, [number, number]> };
}

export interface PlayerHeroAverage {
  id: number;
  name: string;
  matches: number;
  icon: string | null;
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
  impact_score: number;
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
  average_impact_score: number;
  impact_score_matches: number;
  impact_score_version: number;
  heroes: PlayerHeroAverage[];
  recent: RecentPlayerMatch[];
}
