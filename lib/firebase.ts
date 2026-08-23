import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type Credential,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "shanfa-afbf4";

type ServiceAccountFile = ServiceAccount & { project_id?: string };

function projectIdOf(sa: ServiceAccountFile): string {
  if (typeof sa.projectId === "string" && sa.projectId) return sa.projectId;
  if (typeof sa.project_id === "string" && sa.project_id) return sa.project_id;
  return PROJECT_ID;
}

function parseServiceAccount(raw: string): ServiceAccountFile | null {
  try {
    return JSON.parse(raw) as ServiceAccountFile;
  } catch {
    return null;
  }
}

function readJson(path: string): ServiceAccountFile | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ServiceAccountFile;
  } catch {
    return null;
  }
}

/**
 * Resolve Admin credentials the same way shanda does: JSON env, client
 * email + private key, GOOGLE_APPLICATION_CREDENTIALS, then the sibling
 * shanda service-account file in this workspace.
 */
function credentialFromEnv(): { credential: Credential; projectId: string } | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (rawJson) {
    const sa = parseServiceAccount(rawJson);
    if (sa) {
      return {
        credential: cert(sa),
        projectId: projectIdOf(sa),
      };
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (clientEmail && privateKey) {
    return {
      credential: cert({ projectId: PROJECT_ID, clientEmail, privateKey }),
      projectId: PROJECT_ID,
    };
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const candidates = [
    envPath ? resolve(envPath) : "",
    envPath ? resolve(process.cwd(), envPath) : "",
    resolve(process.cwd(), "serviceAccount.json"),
    resolve(process.cwd(), "../shanda/serviceAccount.json"),
  ].filter(Boolean);

  for (const path of candidates) {
    const sa = readJson(path);
    if (sa) {
      return {
        credential: cert(sa),
        projectId: projectIdOf(sa),
      };
    }
  }

  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
    return { credential: applicationDefault(), projectId: PROJECT_ID };
  }

  return null;
}

let app: App | undefined;
let db: Firestore | undefined;
let initAttempted = false;

export function getDb(): Firestore | null {
  if (db) return db;
  if (initAttempted) return null;
  initAttempted = true;

  try {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const resolved = credentialFromEnv();
      if (!resolved) {
        console.warn(
          "[firebase] No Admin credentials found. Search cache is disabled. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
        );
        return null;
      }
      app = initializeApp({
        credential: resolved.credential,
        projectId: resolved.projectId,
      });
      console.log(`[firebase] Admin initialized for project ${resolved.projectId}`);
    }
    db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  } catch (err) {
    console.warn("[firebase] Admin init failed; cache disabled:", err instanceof Error ? err.message : err);
    return null;
  }
}
