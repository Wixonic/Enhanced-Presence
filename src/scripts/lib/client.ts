import { ClientOptions, fetch } from "@tauri-apps/plugin-http";

export class Client extends EventTarget { };

export class RestClient extends Client {
	baseURL: URL;
	headers: Record<string, string> = {
		"Content-Type": "application/json"
	};

	constructor(baseURL: URL) {
		super();

		this.baseURL = baseURL;
	};

	async request(path: string, options?: (RequestInit & ClientOptions)): Promise<Response> {
		const response = await fetch(`${this.baseURL.toString()}${path}`, {
			...options,
			headers: {
				...this.headers,
				...options?.headers
			}
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "(unreadable)");
			throw new Error(`HTTP error: ${response.status} ${response.statusText} — ${body}`);
		} else return response;
	};

	init(token: string): void {
		this.headers["Authorization"] = token;
	};
};