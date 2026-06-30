import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { LocalUser } from "@/types";

function generateDisplayName(id: string): string {
  return `Guest-${id.slice(0, 4).toUpperCase()}`;
}

/**
 * Generates (or restores) a local, anonymous user identity.
 *
 * No login/signup exists in this app. Instead, we mint a UUID on first
 * visit and persist it in localStorage. The backend's `users` table
 * uses this same id as its primary key, so once the FastAPI backend is
 * connected, chat history and documents are scoped to this id with zero
 * change to this hook's contract.
 */
export function useLocalUser(): LocalUser {
  const [user] = useState<LocalUser>(() => {
    const existingId = localStorage.getItem(LOCAL_STORAGE_KEYS.userId);
    const existingName = localStorage.getItem(LOCAL_STORAGE_KEYS.userDisplayName);

    if (existingId && existingName) {
      return { id: existingId, displayName: existingName, createdAt: new Date().toISOString() };
    }

    const id = uuidv4();
    const displayName = generateDisplayName(id);
    return { id, displayName, createdAt: new Date().toISOString() };
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.userId, user.id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.userDisplayName, user.displayName);
  }, [user.id, user.displayName]);

  return user;
}
