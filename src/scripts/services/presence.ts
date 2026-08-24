import { invoke } from "@tauri-apps/api/core";
import { store, type AppleMusicTrack, type PresenceStatus } from "/scripts/lib/store.ts";
import { discordClient } from "/main.ts";

const APPLE_MUSIC_ICON_URL = "https://raw.githubusercontent.com/Wixonic/Enhanced-Presence/Default/src/assets/apple_music.png";
const APPLICATION_ID = "1541405571658555442";

export const getPrimaryArtist = (artistName?: string): string => {
	if (!artistName || artistName === "Unknown Artist") return "";
	const primary = artistName.split(/[,&/]| feat\.? | ft\.? | x /i)[0].trim();
	return primary || artistName;
};

const artworkCache = new Map<string, string | null>();
const mediaProxyCache = new Map<string, string>();

const fetchAlbumArtwork = async (albumName?: string, artistName?: string, trackName?: string): Promise<string | null> => {
	const primaryArtist = getPrimaryArtist(artistName);
	const target = albumName || trackName || "";
	if (!target) return null;

	const key = `${target}|||${primaryArtist}`;
	if (artworkCache.has(key)) return artworkCache.get(key)!;

	const queries: string[] = [];

	if (primaryArtist && target) queries.push(`${primaryArtist} ${target}`);
	if (target) queries.push(target);
	if (trackName && trackName !== target) {
		if (primaryArtist) queries.push(`${primaryArtist} ${trackName}`);
		queries.push(trackName);
	}

	for (const q of queries) {
		try {
			const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=1`);
			if (res.ok) {
				const json = await res.json();
				if (json.results && json.results.length > 0 && json.results[0].artworkUrl100) {
					const artwork = json.results[0].artworkUrl100.replace("100x100bb.jpg", "512x512bb.jpg");
					artworkCache.set(key, artwork);
					return artwork;
				}
			}
		} catch (_e) { }
	}

	artworkCache.set(key, null);
	return null;
};

const resolveMediaProxy = async (urls: string[]): Promise<Map<string, string>> => {
	const result = new Map<string, string>();
	const uncachedUrls: string[] = [];

	for (const url of urls) {
		if (mediaProxyCache.has(url)) {
			result.set(url, mediaProxyCache.get(url)!);
		} else {
			uncachedUrls.push(url);
		}
	}

	if (uncachedUrls.length === 0) return result;

	const token = store.getState().token;
	if (!token) return result;

	try {
		const response = await fetch(`https://discord.com/api/v9/applications/${APPLICATION_ID}/external-assets`, {
			method: "POST",
			headers: {
				"Authorization": token,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ urls: uncachedUrls })
		});

		if (response.ok) {
			const data: { url: string; external_asset_path: string }[] = await response.json();
			for (const item of data) {
				if (item.external_asset_path) {
					const mpPath = item.external_asset_path.startsWith("mp:")
						? item.external_asset_path
						: `mp:${item.external_asset_path}`;
					mediaProxyCache.set(item.url, mpPath);
					result.set(item.url, mpPath);
				}
			}
		}
	} catch (error) {
		console.error("Failed to proxy external assets:", error);
	}

	return result;
};

class PresenceManager {
	private pollInterval: any = null;
	private lastPayloadJson: string | null = null;
	private lastSentTrackId: string | null = null;
	private lastPlaybackStartMs: number = 0;

	init() {
		this.stop();
		this.pollInterval = setInterval(() => this.tick(), 1500);
		store.subscribe(() => this.updatePresence());
		this.tick();
	};

	stop() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	};

	private async tick() {
		const state = store.getState();
		if (!state.appleMusicEnabled) {
			if (state.currentTrack !== null) store.setState({ currentTrack: null });
			return;
		}

		try {
			const rawTrack = await invoke<AppleMusicTrack>("get_apple_music_state");
			const prev = state.currentTrack;
			const isPlaying = rawTrack.player_state === "playing" && !!rawTrack.name;

			if (!isPlaying) {
				if (prev !== null && prev.player_state === "playing") {
					this.lastSentTrackId = null;
					store.setState({ currentTrack: rawTrack });
				}
				return;
			}

			let artworkUrl = prev?.artworkUrl;
			const hasSongChanged = !prev ||
				prev.name !== rawTrack.name ||
				prev.artist !== rawTrack.artist ||
				prev.album !== rawTrack.album;

			if (hasSongChanged || !artworkUrl) {
				artworkUrl = (await fetchAlbumArtwork(rawTrack.album, rawTrack.artist, rawTrack.name)) ?? undefined;
			}

			const trackWithArt: AppleMusicTrack = {
				...rawTrack,
				artworkUrl
			};

			const posDiff = Math.abs((prev?.position ?? 0) - (trackWithArt.position ?? 0));
			const hasChanged = hasSongChanged ||
				prev?.player_state !== trackWithArt.player_state ||
				prev?.artworkUrl !== trackWithArt.artworkUrl ||
				posDiff > 2;

			if (hasChanged) {
				store.setState({ currentTrack: trackWithArt });
				if (hasSongChanged) this.updatePresence(true);
			}
		} catch (_error) {
			if (state.currentTrack !== null) store.setState({ currentTrack: null });
		}
	};

	async updatePresence(forceImmediate: boolean = false) {
		const state = store.getState();
		if (!discordClient.ws || !discordClient.sessionId) return;

		const activities: any[] = [];
		const isMusicPlaying = state.appleMusicEnabled && state.currentTrack && state.currentTrack.player_state === "playing" && !!state.currentTrack.name;

		if (isMusicPlaying) {
			const track = state.currentTrack!;
			const now = Date.now();
			const positionSec = Math.max(0, track.position ?? 0);
			const durationSec = Math.max(0, track.duration ?? 0);

			const currentTrackId = `${track.name}|||${track.artist}|||${track.album}`;
			const isNewSong = this.lastSentTrackId !== currentTrackId;

			if (isNewSong || this.lastPlaybackStartMs === 0) {
				this.lastSentTrackId = currentTrackId;
				this.lastPlaybackStartMs = Math.floor(now - positionSec * 1000);
			} else {
				const expectedPos = (now - this.lastPlaybackStartMs) / 1000;
				if (Math.abs(expectedPos - positionSec) > 4) {
					this.lastPlaybackStartMs = Math.floor(now - positionSec * 1000);
				}
			}

			const startMs = this.lastPlaybackStartMs;
			const endMs = durationSec > 0 ? startMs + Math.floor(durationSec * 1000) : startMs + 180000;

			const urlsToProxy: string[] = [APPLE_MUSIC_ICON_URL];
			if (track.artworkUrl) urlsToProxy.push(track.artworkUrl);

			const proxied = await resolveMediaProxy(urlsToProxy);
			const largeImage = track.artworkUrl
				? (proxied.get(track.artworkUrl) || track.artworkUrl)
				: (proxied.get(APPLE_MUSIC_ICON_URL) || "apple_music");
			const smallImage = proxied.get(APPLE_MUSIC_ICON_URL) || "apple_music";

			const primaryArtist = getPrimaryArtist(track.artist);
			const titleDisplay = primaryArtist && !track.name?.toLowerCase().includes(primaryArtist.toLowerCase())
				? `${primaryArtist} - ${track.name}`
				: (track.name || "Unknown Track");

			const musicActivity: any = {
				application_id: APPLICATION_ID,
				name: titleDisplay,
				type: 2,
				details: track.name || "Unknown Track",
				state: primaryArtist || track.artist || "Unknown Artist",
				timestamps: {
					start: startMs,
					end: endMs
				},
				assets: {
					large_image: largeImage,
					large_text: track.album || track.name,
					small_image: smallImage,
					small_text: "Apple Music"
				},
				party: {
					id: `apple_music:${discordClient.id ?? "user"}`
				},
				sync_id: `apple_music_${track.name}_${track.artist}`,
				flags: 48
			};

			activities.push(musicActivity);
		} else {
			this.lastSentTrackId = null;
			this.lastPlaybackStartMs = 0;
		}

		if (state.customStatusEnabled && state.customStatusText.trim().length > 0) {
			const customActivity: any = {
				name: "Custom Status",
				type: 4,
				state: state.customStatusText.trim()
			};
			if (state.customStatusEmoji.trim().length > 0) customActivity.emoji = { name: state.customStatusEmoji.trim() };
			activities.push(customActivity);
		}

		let status: PresenceStatus;
		const hasActivePresence = activities.length > 0;

		if (state.presenceMode === "dynamic") status = hasActivePresence ? "idle" : "invisible";
		else status = state.presenceMode;

		const payload = {
			status,
			since: 0,
			activities,
			afk: false
		};

		const payloadComparison = {
			status,
			activities: activities.map((activity) => ({
				application_id: activity.application_id,
				name: activity.name,
				type: activity.type,
				details: activity.details,
				state: activity.state,
				emoji: activity.emoji,
				large_image: activity.assets?.large_image,
				large_text: activity.assets?.large_text,
				small_image: activity.assets?.small_image,
				start: activity.timestamps?.start,
				end: activity.timestamps?.end
			}))
		};

		const payloadJson = JSON.stringify(payloadComparison);
		if (!forceImmediate && payloadJson === this.lastPayloadJson) return;

		this.lastPayloadJson = payloadJson;
		await discordClient.sendPresence(payload);
	};
};

export const presenceManager = new PresenceManager();