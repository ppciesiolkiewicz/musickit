/** The parts of a database address a test script may connect to, checked. */
export interface TestDatabase { host: string; port: number; database: string; username: string; password: string; url: string }

/**
 * A database a test script may wipe: only on `localhost` or `127.0.0.1`, with a name ending in `_test`, and no query string or
 * hash (postgres.js reads `?host=` and `?hostaddr=` from the query, which would point it elsewhere than the checked host).
 * Returns the checked parts to connect with, and `url` rebuilt from them alone; null for anything else.
 */
export function localTestDatabase(raw: string | undefined): TestDatabase | null {
  const text = raw?.trim() ?? "";
  if (!URL.canParse(text)) return null;
  const u = new URL(text);
  if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") return null;
  if (u.search !== "" || u.hash !== "" || text.includes("?") || text.includes("#")) return null;
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null;
  const port = u.port === "" ? 5432 : Number(u.port);
  let database: string, username: string, password: string;
  try {
    database = decodeURIComponent(u.pathname.replace(/^\//, ""));
    username = decodeURIComponent(u.username);
    password = decodeURIComponent(u.password);
  } catch {
    return null;
  }
  if (!/^[A-Za-z0-9_]+_test$/.test(database)) return null;
  const auth = username ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ""}@` : "";
  return { host: u.hostname, port, database, username, password, url: `postgres://${auth}${u.hostname}:${port}/${database}` };
}
