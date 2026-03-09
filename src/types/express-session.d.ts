import "express-session";

declare module "express-session" {
  interface SessionData {
    user: {
      uid: string;
      email: string;
      displayName: string;
      photoURL: string;
      role: string;
      credits: number;
    };
  }
}
