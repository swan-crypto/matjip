export interface Restaurant {
  title: string;
  addr1: string;
  tel: string;
  firstimage?: string;
  cat3?: string;
  mapx?: string;
  mapy?: string;
}

export type Phase =
  | "idle"
  | "locating"
  | "located"
  | "fetching"
  | "ready"
  | "spinning"
  | "result";

export type SearchTab = "nearby" | "region";
