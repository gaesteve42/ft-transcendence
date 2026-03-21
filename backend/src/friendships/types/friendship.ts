export type FriendProfile = {
	id: string;
	username: string;
	avatarUrl: string | null;
	isOnline: boolean;
};

export type PendingRequest = {
	from: FriendProfile;
	since: Date;
};
