export interface RequestInstanceState {
  /** the promise of refreshing token */
  refreshTokenPromise: Promise<boolean> | null;
  refreshTokenSessionRevision?: string;
  /** the request error message stack */
  errMsgStack: string[];
  [key: string]: unknown;
}
