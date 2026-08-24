export type PartialType<Type, Partial extends boolean> = Partial extends true ? Type | undefined : Type;

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const join = (base: string, ...path: string[]): string => {
	const baseClean = base.endsWith("/") ? base.slice(0, -1) : base;
	let pathClean = "";
	for (const segment of path) pathClean += `${segment.startsWith("/") ? "" : "/"}${segment}`;
	return `${baseClean}${pathClean}`;
};

export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export class Collection<Type> {
	private cache: Map<string, Type> = new Map();
	private pending: Map<string, Promise<Type | undefined>> = new Map();

	constructor(initialItems?: Record<string, Type>) {
		if (initialItems) for (const [key, value] of Object.entries(initialItems)) this.cache.set(key, value);
	};

	async get(key: string, force?: boolean, cached = true): Promise<Type | undefined> {
		if (cached && !force && this.cache.has(key)) return this.cache.get(key);
		if (this.pending.has(key)) return this.pending.get(key);

		const promise = this.fetch(key).then((item) => {
			this.pending.delete(key);
			if (item !== undefined) this.cache.set(key, item);
			return item;
		}).catch((error) => {
			this.pending.delete(key);
			throw error;
		});

		this.pending.set(key, promise);
		return promise;
	};

	async fetch(key: string): Promise<Type | undefined> {
		throw new Error(`Cannot fetch element "${key}": method not implemented.`);
	};

	cached() {
		return this.cache;
	};

	set(key: string, value: Type): void {
		this.cache.set(key, value);
	};

	has(key: string): boolean {
		return this.cache.has(key);
	};

	delete(key: string): void {
		this.cache.delete(key);
	};

	clear(): void {
		this.cache.clear();
	};

	patch(key: string, value: Partial<Type>): void {
		if (this.cache.has(key)) {
			const existingValue = this.cache.get(key);
			if (existingValue) {
				const updatedValue = { ...existingValue, ...value };
				this.cache.set(key, updatedValue);
			}
		} else this.cache.set(key, value as Type);
	};
};

export class Color {
	static fromHex(hex: string): Color {
		let cleanHex = hex;
		if (cleanHex.startsWith("#")) cleanHex = cleanHex.slice(1);
		const value = parseInt(cleanHex, 16);
		return new Color(value);
	};

	static fromRGB(r: number, g: number, b: number): Color {
		const value = (r << 16) + (g << 8) + b;
		return new Color(value);
	};

	value: number;

	constructor(value: number | string) {
		if (typeof value === "string") {
			let cleanHex = value;
			if (cleanHex.startsWith("#")) cleanHex = cleanHex.slice(1);
			this.value = parseInt(cleanHex, 16);
		} else this.value = value;
	};

	get r(): number {
		return (this.value >> 16) & 0xFF;
	};

	get g(): number {
		return (this.value >> 8) & 0xFF;
	};

	get b(): number {
		return this.value & 0xFF;
	};

	get rgb(): [number, number, number] {
		return [this.r, this.g, this.b];
	};

	get hex(): string {
		return typeof this.value === "number" && !isNaN(this.value) ? `#${(this.value >>> 0).toString(16).padStart(6, "0")}` : "#ffffff";
	};

	toJSON(): number {
		return this.value;
	};
};