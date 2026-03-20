export type FriendProfile = {
	id: string;
	username: string;
	avatarUrl: string | null;
};

export type PendingRequest = {
	from: FriendProfile;
	since: Date;
};
