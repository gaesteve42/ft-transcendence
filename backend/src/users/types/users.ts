import { AuthProvider } from "@prisma/client";

export type User ={ 
	id: string;
	email: string | null;
	username: string;
	passwordHash: string | null;
	steamId: string | null;
	avatarUrl: string | null;
	authProvider: AuthProvider;
	steamLinkedAt: Date | null;
	lastSteamUpdated: Date | null;
	lastSeenAt: Date | null;
};