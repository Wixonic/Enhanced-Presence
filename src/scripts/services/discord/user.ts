import { Collection, Color, PartialType } from "/scripts/lib/utils.ts";

import { CDNElement } from "/scripts/services/discord/cdn.ts";
import { Snowflake } from "/scripts/services/discord/snowflake.ts";

import { discordClient } from "/main.ts";

export interface UserAvatarDecorationData {
	asset: CDNElement;
	sku_id: Snowflake;
	expires_at?: Date;
};

export enum UserNameplateColorPalette {
	None = "none",
	Crimson = "crimson",
	Berry = "berry",
	Sky = "sky",
	Teal = "teal",
	Forest = "forest",
	BubbleGum = "bubble_gum",
	Violet = "violet",
	Cobalt = "cobalt",
	Clover = "clover",
	Lemon = "lemon",
	White = "white"
};

export interface UserNameplateData {
	asset: CDNElement;
	sku_id: Snowflake;
	label: string;
	palette: UserNameplateColorPalette;
	expires_at?: Date;
};

export interface UserCollectibles {
	nameplate?: UserNameplateData;
};

export enum UserDisplayNameStyle {
	Default = 11,
	Bangers = 1,
	BioRhyme = 2,
	CherryBomb = 3,
	Chicle = 4,
	Compagnon = 5,
	MuseoModerno = 6,
	NeoCastel = 7,
	PixelifySans = 8,
	Ribes = 9,
	Sinistre = 10,
	ZillaSlab = 12
};

export enum UserDisplayNameEffect {
	Solid = 1,
	Gradient = 2,
	Neon = 3,
	Toon = 4,
	Pop = 5,
	Glow = 6
};

export interface DisplayNameStyle {
	font_id: UserDisplayNameStyle;
	effect_id?: UserDisplayNameEffect;
	colors: Color[];
};

export interface UserPrimaryGuild {
	identity_enabled?: boolean;
	identity_guild_id?: Snowflake;
	tag?: string;
	badge?: CDNElement;
};

const PublicUserFlags = {
	Staff: 1n << 0n,
	Partner: 1n << 1n,
	HypeSquad: 1n << 2n,
	BugHunterLevel1: 1n << 3n,
	HypeSquadBravery: 1n << 6n,
	HypeSquadBrilliance: 1n << 7n,
	HypeSquadBalance: 1n << 8n,
	PremiumEarlySupporter: 1n << 9n,
	TeamPseudoUser: 1n << 10n,
	DiscordBugHunterLevel2: 1n << 14n,
	VerifiedBot: 1n << 16n,
	EarlyVerifiedDeveloper: 1n << 17n,
	CertifiedModeratorAlumni: 1n << 18n,
	BotHTTPInteractions: 1n << 19n,
	Spammer: 1n << 20n,
	ProvisionalAccount: 1n << 23n
} as const;
export type PublicUserFlags = typeof PublicUserFlags[keyof typeof PublicUserFlags];

const UserFlags = {
	...PublicUserFlags,
	MFASMS: 1n << 4n,
	IsHubSpotContact: 1n << 11n,
	HasUnreadUrgentMessages: 1n << 13n,
	UnderageDeleted: 1n << 15n,
	ProvisionalAccount: 1n << 23n,
	HighGlobalRateLimit: 1n << 33n,
	Deleted: 1n << 34n,
	DisabledSuspiciousActivity: 1n << 35n,
	SelfDeleted: 1n << 36n,
	PremiumDiscriminator: 1n << 37n,
	UsedDesktopClient: 1n << 38n,
	UsedWebClient: 1n << 39n,
	UsedMobileClient: 1n << 40n,
	Disabled: 1n << 41n,
	HasSessionStarted: 1n << 43n,
	Quarantined: 1n << 44n,
	PremiumEligibleForUniqueUsername: 1n << 47n,
	Collaborator: 1n << 50n,
	RestrictedCollaborator: 1n << 51n
} as const;
export type UserFlags = typeof UserFlags[keyof typeof UserFlags];

export enum UserLinkStatus {
	Requested = 1,
	Connected = 2,
	Disconnected = 3,
	Rejected = 4
};

export enum UserLinkType {
	User = 1,
	Requestor = 2
};

export interface UserLinkedUser {
	created_at: Date;
	updated_at: Date;
	link_status: UserLinkStatus;
	link_type: UserLinkType;
	requestor_id: Snowflake;
	user_id: Snowflake;
};

export enum UserAgeVerificationStatus {
	Unverified = 1,
	VerifiedTeen = 2,
	VerifiedAdult = 3,
	InferredAdult = 4
};

export enum UserPremiumType {
	None = 0,
	NitroClassic = 1,
	Nitro = 2,
	NitroBasic = 3
};

export enum UserPremiumSource {
	Subscription = 1,
	FractionalPremium = 2,
	ReverseTrial = 3,
	SubscriptionGroup = 4
};

export enum UserPremiumSubscriptionType {
	BoostOnly = 1,
	NitroBasic = 2,
	NitroClassic = 3,
	Nitro = 4
};

export enum UserPremiumSubscriptionGroupRole {
	Primary = 1,
	Member = 2
};

export interface UserPremiumState {
	premium_source: UserPremiumSource;
	premium_subscription_type: UserPremiumSubscriptionType;
	premium_subscription_group_role?: UserPremiumSubscriptionGroupRole;
};

const UserPurchasedFlags = {
	NitroClassic: 1n << 0n,
	Nitro: 1n << 1n,
	GuildBoost: 1n << 2n,
	NitroBasic: 1n << 3n,
	ReverseTrial: 1n << 4n
} as const;
export type UserPurchasedFlags = typeof UserPurchasedFlags[keyof typeof UserPurchasedFlags];

const UserPremiumUsageFlags = {
	PremiumDiscriminator: 1n << 0n,
	AnimatedAvatar: 1n << 1n,
	ProfileBanner: 1n << 2n
} as const;
export type UserPremiumUsageFlags = typeof UserPremiumUsageFlags[keyof typeof UserPremiumUsageFlags];

export enum UserAuthenticatorType {
	WebAuthn = 1,
	TimeBasedOneTimePassword = 2,
	SMS = 3
};

export interface UserCustomStatus {
	text?: string;
	emoji_id?: Snowflake;
	emoji_name?: string;
	expires_at?: Date;
};

export enum UserStatusType {
	Online = "online",
	Idle = "idle",
	Dnd = "dnd",
	Invisible = "invisible",
	Offline = "offline",
	Unknown = "unknown"
};

export class User<Partial extends boolean = false> {
	id: Snowflake;
	username: string;
	discriminator: string;
	global_name?: string;
	avatar: CDNElement;
	avatar_decoration_data?: UserAvatarDecorationData;
	collectibles?: UserCollectibles;
	display_name_styles?: DisplayNameStyle;
	primary_guild?: UserPrimaryGuild;
	bot?: boolean;
	system?: boolean;
	banner?: CDNElement;
	accent_color?: Color;
	public_flags?: PublicUserFlags;

	linked_users!: PartialType<UserLinkedUser[], Partial>;
	mfa_enabled!: PartialType<boolean, Partial>;
	nsfw_allowed?: PartialType<boolean, Partial>;
	age_verification_status!: PartialType<UserAgeVerificationStatus, Partial>;
	pronouns?: PartialType<string, Partial>;
	bio!: PartialType<string, Partial>;
	locale?: PartialType<string, Partial>;
	verified!: PartialType<boolean, Partial>;
	email!: PartialType<string, Partial>;
	phone?: PartialType<string, Partial>;
	premium_type!: PartialType<UserPremiumType, Partial>;
	premium_state?: PartialType<UserPremiumState, Partial>;
	personal_connection_id?: PartialType<Snowflake, Partial>;
	flags!: PartialType<UserFlags, Partial>;
	purchased_flags?: PartialType<UserPurchasedFlags, Partial>;
	premium_usage_flags?: PartialType<UserPremiumUsageFlags, Partial>;
	desktop?: PartialType<boolean, Partial>;
	mobile?: PartialType<boolean, Partial>;
	has_bounced_email?: PartialType<boolean, Partial>;
	authenticator_types?: PartialType<UserAuthenticatorType[], Partial>;
	analytics_token!: PartialType<string, Partial>;

	constructor(data: any) {
		const Partial = data.verified === undefined;

		this.id = data.id;
		this.username = data.username;
		this.discriminator = data.discriminator;
		this.global_name = data.global_name;
		this.avatar = data.avatar ? new CDNElement(`/avatars/${data.id}`, data.avatar) : new CDNElement("/embed/avatars", this.user_index.toString());
		if (data.avatar_decoration_data) this.avatar_decoration_data = {
			asset: new CDNElement("/avatar-decoration-presets", data.avatar_decoration_data.asset),
			sku_id: data.avatar_decoration_data.sku_id,
			expires_at: data.avatar_decoration_data.expires_at ? new Date(data.avatar_decoration_data.expires_at) : undefined
		};
		if (data.collectibles) this.collectibles = {
			nameplate: data.collectibles.nameplate ? {
				asset: new CDNElement(`/assets/collectibles/`, data.collectibles.nameplate.asset),
				sku_id: data.collectibles.nameplate.sku_id,
				label: data.collectibles.nameplate.label,
				palette: data.collectibles.nameplate.palette,
				expires_at: data.collectibles.nameplate.expires_at ? new Date(data.collectibles.nameplate.expires_at) : undefined
			} : undefined
		};
		const displayNameStyles = data.display_name_styles ?? data.display_name_style;
		if (displayNameStyles) {
			if (typeof displayNameStyles === "object") this.display_name_styles = {
				font_id: displayNameStyles.font_id ?? displayNameStyles.fontId ?? displayNameStyles.font,
				effect_id: displayNameStyles.effect_id ?? displayNameStyles.effectId ?? displayNameStyles.effect,
				colors: (displayNameStyles.colors ?? displayNameStyles.colours ?? []).map((color: any) => color instanceof Color ? color : new Color(color))
			};
			else if (typeof displayNameStyles === "number") this.display_name_styles = {
				font_id: displayNameStyles,
				effect_id: undefined,
				colors: []
			};
		};
		if (data.primary_guild) this.primary_guild = {
			identity_enabled: data.primary_guild.identity_enabled,
			identity_guild_id: data.primary_guild.identity_guild_id,
			tag: data.primary_guild.tag,
			badge: data.primary_guild.badge ? new CDNElement(`/guild-tag-badges/${data.primary_guild.identity_guild_id}`, data.primary_guild.badge) : undefined
		};
		this.bot = data.bot;
		this.system = data.system;
		if (data.banner) this.banner = new CDNElement(`/banners/${data.id}`, data.banner);
		if (data.accent_color !== undefined && data.accent_color !== null) this.accent_color = new Color(data.accent_color);
		this.public_flags = data.public_flags;

		if (Partial == false) {
			this.linked_users = (data.linked_users ?? []).map((link: any) => ({
				created_at: new Date(link.created_at),
				updated_at: new Date(link.updated_at),
				link_status: link.link_status,
				link_type: link.link_type,
				requestor_id: link.requestor_id,
				user_id: link.user_id
			}));
			this.mfa_enabled = data.mfa_enabled;
			this.nsfw_allowed = data.nsfw_allowed;
			this.age_verification_status = data.age_verification_status;
			this.pronouns = data.pronouns;
			this.bio = data.bio;
			this.locale = data.locale;
			this.verified = data.verified;
			this.email = data.email;
			this.phone = data.phone;
			this.premium_type = data.premium_type;
			if (data.premium_state) this.premium_state = {
				premium_source: data.premium_state.premium_source,
				premium_subscription_type: data.premium_state.premium_subscription_type,
				premium_subscription_group_role: data.premium_state.premium_subscription_group_role
			};
			this.personal_connection_id = data.personal_connection_id;
			this.flags = data.flags;
			this.purchased_flags = data.purchased_flags;
			this.premium_usage_flags = data.premium_usage_flags;
			this.desktop = data.desktop;
			this.mobile = data.mobile;
			this.has_bounced_email = data.has_bounced_email;
			this.authenticator_types = data.authenticator_types;
			this.analytics_token = data.analytics_token;
		}
	};

	get user_index(): number {
		return this.discriminator === "0" ? (parseInt(this.id) >> 22) % 6 : parseInt(this.discriminator) % 5;
	};

	get display_name(): string {
		return this.global_name || this.username;
	};
};

export class UserCollection extends Collection<User | User<true>> {
	async fetch<Partial extends boolean = false>(id: Snowflake, partial: Partial = false as Partial): Promise<User<Partial>> {
		const response = await discordClient.rest.request(`/users/${id}${partial ? "/basic" : ""}`);
		const user = new User<Partial>(await response.json());
		discordClient.users.patch(id, user);
		return user;
	};
};