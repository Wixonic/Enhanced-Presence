type TooltipOrientation = "right" | "left" | "top" | "bottom";

let tooltipEl: HTMLElement | null = null;
let currentTarget: Element | null = null;
let rafId: number | null = null;
let mouseX: number | null = null;
let mouseY: number | null = null;

const getTooltip = (): HTMLElement => {
	if (!tooltipEl) {
		tooltipEl = document.createElement("div");
		tooltipEl.classList.add("tooltip");
		document.body.appendChild(tooltipEl);
	}
	return tooltipEl;
};

const findTooltipTarget = (el: Element | null): Element | null => {
	while (el) {
		if (el.hasAttribute("tooltip")) return el;
		el = el.parentElement;
	}
	return null;
};

const positionTooltip = (tooltip: HTMLElement, rect: DOMRect, orientation: TooltipOrientation): void => {
	const gap = 8;
	const margin = 4;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const tw = tooltip.offsetWidth;
	const th = tooltip.offsetHeight;

	let o = orientation;
	if (o === "right" && rect.right + gap + tw > vw - margin) o = "left";
	else if (o === "left" && rect.left - gap - tw < margin) o = "right";
	else if (o === "top" && rect.top - gap - th < margin) o = "bottom";
	else if (o === "bottom" && rect.bottom + gap + th > vh - margin) o = "top";

	let top: number;
	let left: number;

	switch (o) {
		case "right":
			top = rect.top + (rect.height - th) / 2;
			left = rect.right + gap;
			break;
		case "left":
			top = rect.top + (rect.height - th) / 2;
			left = rect.left - gap - tw;
			break;
		case "top":
			top = rect.top - gap - th;
			left = rect.left + (rect.width - tw) / 2;
			break;
		case "bottom":
			top = rect.bottom + gap;
			left = rect.left + (rect.width - tw) / 2;
			break;
	};

	tooltip.style.top = `${Math.max(margin, Math.min(top!, vh - th - margin))}px`;
	tooltip.style.left = `${Math.max(margin, Math.min(left!, vw - tw - margin))}px`;
};

const trackPosition = (): void => {
	if (!currentTarget) return;
	const tooltip = getTooltip();
	const orientation = (currentTarget.getAttribute("tooltip-orientation") ?? "right") as TooltipOrientation;
	positionTooltip(tooltip, currentTarget.getBoundingClientRect(), orientation);
	rafId = requestAnimationFrame(trackPosition);
};

const stopTracking = (): void => {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
};

const updateTooltipAtMouse = (): void => {
	if (mouseX === null || mouseY === null) return;
	const element = document.elementFromPoint(mouseX, mouseY);
	const target = findTooltipTarget(element);
	const tooltip = getTooltip();

	if (target) {
		if (target !== currentTarget) {
			currentTarget = target;
			tooltip.textContent = target.getAttribute("tooltip") || "";
			stopTracking();
			trackPosition();
		}
		tooltip.style.opacity = "1";
	} else {
		currentTarget = null;
		stopTracking();
		tooltip.style.opacity = "0";
	}
};

document.addEventListener("mousemove", (event) => {
	mouseX = event.clientX;
	mouseY = event.clientY;
});

document.addEventListener("mouseover", (event) => {
	const target = findTooltipTarget(event.target as Element);
	if (!target) return;

	const tooltip = getTooltip();

	if (target !== currentTarget) {
		currentTarget = target;
		tooltip.textContent = target.getAttribute("tooltip") || "";
		stopTracking();
		trackPosition();
	}

	tooltip.style.opacity = "1";
});

document.addEventListener("mouseout", (event) => {
	const from = findTooltipTarget(event.target as Element);
	const to = findTooltipTarget(event.relatedTarget as Element | null);
	if (from !== to) {
		currentTarget = null;
		stopTracking();
		getTooltip().style.opacity = "0";
	}
});

window.addEventListener("scroll", () => {
	updateTooltipAtMouse();
}, { capture: true, passive: true });