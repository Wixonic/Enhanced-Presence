import { openUrl } from "@tauri-apps/plugin-opener";

export interface EnhancedPresenceLink {
	path: string;
	params: URLSearchParams;
	raw: URL;
};

class LinkManager extends EventTarget {
	navigate(href: string): void {
		const url = this.parse(href);

		if (!url) {
			console.warn(`[link] Ignoring malformed link: ${href}`);
			return;
		}

		this.route(url);
	};

	init(): void {
		document.addEventListener("click", (event: MouseEvent) => {
			const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
			if (!anchor) return;

			const href = anchor.getAttribute("href") ?? "";
			if (!href || href.startsWith("#")) return;

			event.preventDefault();
			event.stopImmediatePropagation();

			this.navigate(href);
		}, { capture: true });
	};

	private parse(href: string): URL | null {
		if (href.startsWith("//")) href = `https:${href}`;

		try {
			return new URL(href);
		} catch {
			return null;
		}
	};

	private route(url: URL): void {
		switch (url.protocol) {
			case "https:":
			case "http:": {
				openUrl(url.toString()).catch((error) => {
					console.error(`[link] Could not open "${url}" in browser:`, error);
				});
				break;
			}

			case "enhanced-presence:": {
				this.dispatch(url);
				break;
			}

			default: {
				console.warn(`[link] Protocol "${url.protocol}" is blocked.`);
				break;
			}
		}
	};

	private dispatch(url: URL): void {
		const detail: EnhancedPresenceLink = {
			path: url.pathname.replace(/^\//, ""),
			params: url.searchParams,
			raw: url
		};

		const dispatched = this.dispatchEvent(new CustomEvent<EnhancedPresenceLink>(url.hostname, { detail }));
		if (!dispatched) return;
		if (!this.hasListeners(url.hostname)) console.warn(`[link] No handler registered for ${url.protocol}//${url.hostname} — link ignored.`);
	};

	private hasListeners(type: string): boolean {
		return this.counts.get(type) !== undefined && this.counts.get(type)! > 0;
	};

	private counts = new Map<string, number>();

	override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
		super.addEventListener(type, callback, options);
		this.counts.set(type, (this.counts.get(type) ?? 0) + 1);
	};

	override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void {
		super.removeEventListener(type, callback, options);
		const count = (this.counts.get(type) ?? 1) - 1;
		if (count <= 0) this.counts.delete(type);
		else this.counts.set(type, count);
	};
};

export const links = new LinkManager();