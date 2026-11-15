/**
 * Where a player's data lives. Without accounts (no database) it stays in the browser, as before. With accounts, a
 * signed-in player's data is on the server, and a visitor's tools run over memory that saves nothing.
 */
export type DataSource = "server" | "local" | "memory";

export function pickSource(accountsOn: boolean, signedIn: boolean): DataSource {
  if (!accountsOn) return "local";
  return signedIn ? "server" : "memory";
}
