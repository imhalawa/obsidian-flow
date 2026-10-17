export interface Viewport {
	name: string;
	width: number;
	height: number;
	scale: number;
}

export const DESKTOP_VIEWPORTS: Viewport[] = [
	{ name: 'smallest window', width: 400, height: 300, scale: 1 },
	{ name: 'half of a laptop screen', width: 640, height: 720, scale: 1 },
	{ name: 'laptop 720p', width: 1280, height: 720, scale: 1 },
	{ name: 'laptop 1366', width: 1366, height: 768, scale: 1 },
	{ name: 'full HD', width: 1920, height: 1080, scale: 1 },
	{ name: 'QHD', width: 2560, height: 1440, scale: 1 },
	{ name: 'ultrawide', width: 3440, height: 1440, scale: 1 },
	{ name: '4K', width: 3840, height: 2160, scale: 1 },
	{ name: 'laptop at 125 percent', width: 1536, height: 864, scale: 1.25 },
	{ name: 'full HD at 150 percent', width: 1280, height: 720, scale: 1.5 },
	{ name: 'retina', width: 1440, height: 900, scale: 2 },
	{ name: '4K at 200 percent', width: 1920, height: 1080, scale: 2 },
];

export const TABLET_VIEWPORTS: Viewport[] = [
	{ name: 'iPad portrait', width: 768, height: 1024, scale: 2 },
	{ name: 'iPad landscape', width: 1024, height: 768, scale: 2 },
	{ name: 'iPad Air portrait', width: 820, height: 1180, scale: 2 },
	{ name: 'iPad Pro 12.9 portrait', width: 1024, height: 1366, scale: 2 },
	{ name: 'iPad Pro 12.9 landscape', width: 1366, height: 1024, scale: 2 },
	{ name: 'Android tablet portrait', width: 800, height: 1280, scale: 1.5 },
	{ name: 'Android tablet landscape', width: 1280, height: 800, scale: 1.5 },
	{ name: 'small tablet', width: 601, height: 962, scale: 2 },
];

export const PHONE_VIEWPORTS: Viewport[] = [
	{ name: 'iPhone SE first generation', width: 320, height: 568, scale: 2 },
	{ name: 'Android small', width: 360, height: 640, scale: 3 },
	{ name: 'iPhone SE', width: 375, height: 667, scale: 2 },
	{ name: 'iPhone 14', width: 390, height: 844, scale: 3 },
	{ name: 'Pixel 7', width: 412, height: 915, scale: 2.6 },
	{ name: 'iPhone 14 Pro Max', width: 430, height: 932, scale: 3 },
	{ name: 'phone landscape', width: 667, height: 375, scale: 2 },
	{ name: 'large phone landscape', width: 932, height: 430, scale: 3 },
];
