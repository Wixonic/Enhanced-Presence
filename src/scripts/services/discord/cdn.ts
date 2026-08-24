import { join } from "/scripts/lib/utils.ts";

export class CDNElement {
	static readonly baseURL = "https://cdn.discordapp.com";

	path: string;
	hash: string;

	constructor(path: string, hash: string) {
		this.path = path;
		this.hash = hash;
	};

	get animated(): boolean {
		return this.hash.startsWith("a_");
	};

	getURL(format: string = "webp", size?: number, quality?: "lossless" | "high" | "low", keep_aspect_ratio?: boolean, passthrough?: boolean, animated?: boolean): string {
		const searchParams = new URLSearchParams();
		if (size !== undefined) searchParams.set("size", size.toString());
		if (quality !== undefined) searchParams.set("quality", quality.toString());
		if (keep_aspect_ratio !== undefined) searchParams.set("keep_aspect_ratio", keep_aspect_ratio.toString());
		if (passthrough !== undefined) searchParams.set("passthrough", passthrough.toString());
		if (animated !== undefined) searchParams.set("animated", animated.toString());

		const query = searchParams.toString();
		return join(CDNElement.baseURL, this.path, `${this.hash}${format ? `.${format}` : ""}`) + (query ? `?${query}` : "");
	};
};