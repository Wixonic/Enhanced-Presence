export type GatewayMessage = {
	code: number;
	data: any;
	sequence?: number;
	event?: string;
};

export enum GatewayOpCode {
	Dispatch = 0,
	Heartbeat = 1,
	Identify = 2,
	PresenceUpdate = 3,
	Resume = 6,
	Reconnect = 7,
	InvalidSession = 9,
	Hello = 10,
	HeartbeatACK = 11
};

export enum GatewayEvent {
	Heartbeat = "heartbeat",
	Connecting = "connecting",
	Disconnected = "disconnected",
	Resumed = "resumed"
};

export enum GatewayDispatchEvent {
	Ready = "READY",
	Resumed = "RESUMED",
	SessionsReplace = "SESSIONS_REPLACE",
	PresenceUpdate = "PRESENCE_UPDATE",
	UserSettingsProtoUpdate = "USER_SETTINGS_PROTO_UPDATE"
};

export enum GatewayCloseCode {
	UnknownError = 4000,
	UnknownOpcode = 4001,
	DecodeError = 4002,
	NotAuthenticated = 4003,
	AuthenticationFailed = 4004,
	AlreadyAuthenticated = 4005,
	InvalidSeq = 4007,
	RateLimited = 4008,
	SessionTimeout = 4009,
	InvalidShard = 4010,
	ShardingRequired = 4011,
	InvalidApiVersion = 4012,
	InvalidIntents = 4013,
	DisallowedIntents = 4014
};

export const GatewayIntents = {
	UserSettingsProto: 1n << 9n
} as const;
export type GatewayIntents = typeof GatewayIntents[keyof typeof GatewayIntents];