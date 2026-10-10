export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: any }
  | any[];

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      [key: string]: {
        Row: any;
      };
    };
    Functions: {
      [key: string]: any;
    };
  };
}
