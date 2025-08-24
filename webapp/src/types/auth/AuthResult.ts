// AuthResult type for authentication function results

export type AuthResult = {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
};
