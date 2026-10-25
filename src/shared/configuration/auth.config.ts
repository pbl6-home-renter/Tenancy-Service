export interface AuthConfig {
  jwksUrl: string;
  publicKey: string;
  issuer: string;
  audience: string;
  serviceToken: string;
}
