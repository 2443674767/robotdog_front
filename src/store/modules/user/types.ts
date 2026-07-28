export interface UserState {
  name?: string;
  nickname?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
  introduction?: string;
  id?: number;
  business_id?: number;
  rooturls?: any;
  defrooturl?: string;
  sessionTimeout?: boolean;
  btnroles?: string[];
  created_at?: string;
  pwd_reset_time?: string;
}
