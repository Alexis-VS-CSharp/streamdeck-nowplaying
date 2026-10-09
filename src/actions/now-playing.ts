import streamDeck, {
	action,
	DialDownEvent,
	DidReceiveSettingsEvent,
	DialRotateEvent,
	SingletonAction,
	TouchTapEvent,
	WillAppearEvent,
	WillDisappearEvent
} from "@elgato/streamdeck";
import { nowPlayingService, NowPlayingPayload } from "../now-playing-service";
import { textWidthPx } from "../text-metrics";

type NowPlayingSettings = {
	filter?: string;
	showNext?: boolean;
};

type FieldState = {
	text: string;
	pos: number;
	hold: number;
};

// Position interpolee entre deux polls du bridge (1.5s) pour un compteur fluide.
type Timeline = {
	baseMs: number;
	baseAt: number;
	durationMs: number;
	playing: boolean;
};

// normal = titre/artiste en cours ; label = "Prochain son" ; next = titre/artiste suivants (fin de morceau)
type Mode = "normal" | "label" | "next";

type DialState = {
	trackKey: string;
	curTitle: string;
	curArtist: string;
	mode: Mode;
	nextTitle: string;
	nextArtist: string;
	nextRequested: boolean;
	title: FieldState;
	artist: FieldState;
	paused: boolean;
	timeline: Timeline;
	shownElapsed: string;
};

const DEFAULT_FILTER = "Apple";
const SCROLL_INTERVAL_MS = 400;
const SCROLL_HOLD_TICKS = 5; // pause a chaque retour a 0 (5 * 400ms = 2s)
const RESYNC_THRESHOLD_MS = 1500; // ecart max poll/interpolation avant de resynchroniser
const CLICK_WINDOW_MS = 350; // 1 clic = pause/lecture, 2 = suivant, 3+ = precedent

// Defilement en pixels (rect du layout = 90px, marge de securite incluse) :
// les majuscules sont bien plus larges que les minuscules.
type ScrollSpec = { fontPx: number; semibold: boolean; maxPx: number; separator: string };
const TITLE_SPEC: ScrollSpec = { fontPx: 15, semibold: true, maxPx: 86, separator: " — " }; // tiret cadratin pour marquer la boucle
const ARTIST_SPEC: ScrollSpec = { fontPx: 12, semibold: false, maxPx: 86, separator: " " };
const LABEL_SPEC: ScrollSpec = { fontPx: 13, semibold: true, maxPx: 86, separator: " — " };
const NEXT_LABEL = "Prochain son";
// Annonce du prochain titre : a TEASER_MS de la fin, "Prochain son" pendant LABEL_MS, puis le titre suivant.
const TEASER_MS = 12000;
const LABEL_MS = 3000;
const FETCH_AT_MS = 25000; // la lecture de la file prend ~5-10s : on la lance bien avant l'annonce
const MIN_TEASER_DURATION_MS = 40000; // pas d'annonce sur les morceaux tres courts

/**
 * Le champ "Artist" expose par Apple Music via SMTC contient parfois
 * "Artiste — Album" ou "Artiste1, Artiste2 — Titre - Single" en plus du nom.
 * On ne garde que la partie avant le tiret cadratin.
 */
function cleanArtist(raw: string | undefined): string {
	if (!raw) return "";
	return raw.split(/\s+—\s+/)[0].trim();
}

/** "Artiste1, Artiste2, Artiste3" -> "Artiste1 feat. Artiste2, Artiste3" */
function formatArtists(raw: string): string {
	const parts = raw
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length <= 1) {
		return raw;
	}
	return `${parts[0]} feat. ${parts.slice(1).join(", ")}`;
}

function formatTime(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const ss = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function positionOf(t: Timeline): number {
	const pos = t.playing ? t.baseMs + (Date.now() - t.baseAt) : t.baseMs;
	return Math.min(t.durationMs, Math.max(0, pos));
}

function timeFeedback(t: Timeline): { progress: number; elapsed: string; remaining: string } {
	if (t.durationMs <= 0) {
		return { progress: 0, elapsed: "", remaining: "" };
	}
	const pos = positionOf(t);
	return {
		progress: (pos / t.durationMs) * 100,
		elapsed: formatTime(pos),
		remaining: `-${formatTime(Math.ceil((t.durationMs - pos) / 1000) * 1000)}`
	};
}

function makeFieldState(text: string): FieldState {
	return { text, pos: 0, hold: SCROLL_HOLD_TICKS };
}

function fits(text: string, spec: ScrollSpec): boolean {
	return textWidthPx(text, spec.fontPx, spec.semibold) <= spec.maxPx;
}

/** Defilement circulaire : le texte boucle sur lui-meme (separe par `spec.separator`), la fenetre visible fait au plus `spec.maxPx` pixels. */
function scrollText(text: string, pos: number, spec: ScrollSpec): string {
	if (fits(text, spec)) {
		return text;
	}
	const cycle = text + spec.separator;
	let out = "";
	let width = 0;
	for (let i = 0; i < cycle.length; i++) {
		const ch = cycle[(pos + i) % cycle.length];
		const w = textWidthPx(ch, spec.fontPx, spec.semibold);
		if (width + w > spec.maxPx) {
			break;
		}
		out += ch;
		width += w;
	}
	return out;
}

/** Avance un FieldState d'un cran ; renvoie true si le texte affiche a change. */
function tickField(state: FieldState, spec: ScrollSpec): boolean {
	if (fits(state.text, spec)) {
		return false;
	}
	if (state.hold > 0) {
		state.hold -= 1;
		return false;
	}
	const cycle = state.text + spec.separator;
	const cycleLen = cycle.length;
	let next = state.pos + 1;
	if (next >= cycleLen) {
		next = 0;
	} else if (cycle[next] === " ") {
		// Une frame qui commence par une espace est tronquee au rendu Stream
		// Deck (donne l'impression d'un double palier) : on saute dessus.
		next += 1;
		if (next >= cycleLen) {
			next = 0;
		}
	}
	state.pos = next;
	if (state.pos === 0) {
		state.hold = SCROLL_HOLD_TICKS;
	}
	return true;
}

function remainingMs(state: DialState): number {
	return state.timeline.durationMs - positionOf(state.timeline);
}

function wantedMode(state: DialState): Mode {
	if (!state.nextTitle || state.timeline.durationMs < MIN_TEASER_DURATION_MS) {
		return "normal";
	}
	const remaining = remainingMs(state);
	if (remaining > TEASER_MS) {
		return "normal";
	}
	return remaining > TEASER_MS - LABEL_MS ? "label" : "next";
}

function titleSpec(state: DialState): ScrollSpec {
	return state.mode === "label" ? LABEL_SPEC : TITLE_SPEC;
}

/** Valeur + police + couleur du titre : le libelle "Prochain son" est plus petit et grise pour tenir sur la ligne. */
function titleFeedback(state: DialState): { value: string; font: { size: number; weight: number }; color: string } {
	const label = state.mode === "label";
	return {
		value: scrollText(state.title.text, state.title.pos, titleSpec(state)),
		font: { size: label ? 13 : 15, weight: 600 },
		color: label ? "#B0B0B0" : "#FFFFFF"
	};
}

function artistFeedback(state: DialState): string {
	return scrollText(state.artist.text, state.artist.pos, ARTIST_SPEC) || (state.mode === "normal" ? "Apple Music" : "");
}

/** Bascule normal / "Prochain son" / titre suivant selon le temps restant. Renvoie true si l'affichage doit etre renvoye. */
function syncMode(state: DialState): boolean {
	const wanted = wantedMode(state);
	if (wanted === state.mode) {
		return false;
	}
	state.mode = wanted;
	state.title = makeFieldState(wanted === "normal" ? state.curTitle : wanted === "label" ? NEXT_LABEL : state.nextTitle);
	state.artist = makeFieldState(wanted === "normal" ? state.curArtist : wanted === "label" ? "" : state.nextArtist);
	return true;
}

@action({ UUID: "com.alexisvscsharp.nowplaying.nowplaying" })
export class NowPlayingAction extends SingletonAction<NowPlayingSettings> {
	private scrollTimer: NodeJS.Timeout | null = null;
	private dialState = new Map<string, DialState>();
	private clickState = new Map<string, { count: number; timer: NodeJS.Timeout }>();
	private showNext = new Map<string, boolean>();
	private onUpdate = (data: NowPlayingPayload) => void this.render(data);

	override async onWillAppear(ev: WillAppearEvent<NowPlayingSettings>): Promise<void> {
		const filter = ev.payload.settings?.filter?.trim() || DEFAULT_FILTER;
		this.showNext.set(ev.action.id, ev.payload.settings?.showNext !== false);
		if ([...this.actions].length === 1) {
			nowPlayingService.on("update", this.onUpdate);
		}
		nowPlayingService.acquire(filter);
		this.ensureScrollTimer();
		void this.render(nowPlayingService.latest);
	}

	override onWillDisappear(ev: WillDisappearEvent<NowPlayingSettings>): void {
		this.dialState.delete(ev.action.id);
		this.showNext.delete(ev.action.id);
		const pendingClick = this.clickState.get(ev.action.id);
		if (pendingClick) {
			clearTimeout(pendingClick.timer);
			this.clickState.delete(ev.action.id);
		}
		nowPlayingService.release();
		if ([...this.actions].length === 0) {
			nowPlayingService.off("update", this.onUpdate);
			this.stopScrollTimer();
		}
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<NowPlayingSettings>): Promise<void> {
		const enabled = ev.payload.settings?.showNext !== false;
		this.showNext.set(ev.action.id, enabled);
		const state = this.dialState.get(ev.action.id);
		if (!state || enabled) {
			return;
		}
		// Option decochee : on oublie le titre suivant et on revient a l'affichage normal.
		state.nextTitle = "";
		state.nextArtist = "";
		if (syncMode(state) && ev.action.isDial()) {
			await ev.action.setFeedback({ title: titleFeedback(state), artist: artistFeedback(state) });
		}
	}

	override async onDialDown(ev: DialDownEvent<NowPlayingSettings>): Promise<void> {
		const id = ev.action.id;
		const pending = this.clickState.get(id);
		if (pending) {
			clearTimeout(pending.timer);
			pending.count += 1;
		}
		const state = pending ?? { count: 1, timer: null as unknown as NodeJS.Timeout };
		this.clickState.set(id, state);
		state.timer = setTimeout(() => {
			this.clickState.delete(id);
			if (state.count === 1) {
				nowPlayingService.control("Toggle");
			} else if (state.count === 2) {
				nowPlayingService.control("Next");
			} else {
				nowPlayingService.control("Previous");
			}
		}, CLICK_WINDOW_MS);
	}

	override async onTouchTap(): Promise<void> {
		nowPlayingService.control("Toggle");
	}

	override async onDialRotate(ev: DialRotateEvent<NowPlayingSettings>): Promise<void> {
		nowPlayingService.control(ev.payload.ticks > 0 ? "Next" : "Previous");
	}

	private async render(data: NowPlayingPayload): Promise<void> {
		for (const visibleAction of this.actions) {
			if (!visibleAction.isDial()) {
				continue;
			}

			if (!data.hasSession) {
				this.dialState.delete(visibleAction.id);
				await visibleAction.setFeedback({
					title: { value: "Apple Music", font: { size: 15, weight: 600 }, color: "#FFFFFF" },
					artist: "—",
					pauseIcon: { enabled: false },
					progress: 0,
					elapsed: "",
					remaining: ""
				});
				continue;
			}

			const title = data.title?.trim() || "?";
			const artist = formatArtists(cleanArtist(data.artist));
			const paused = data.status === "Paused";
			const polled = Math.max(0, data.positionMs ?? 0);
			const duration = data.durationMs ?? 0;
			const trackKey = `${title}|${artist}`;
			const previous = this.dialState.get(visibleAction.id);
			const trackChanged = !previous || previous.trackKey !== trackKey;

			// Garde l'interpolation en cours tant que le poll (arrondi a la seconde)
			// est coherent avec elle ; sinon (piste, pause/lecture, seek) on resynchronise.
			const prevTimeline = previous?.timeline;
			const keepTimeline =
				!trackChanged &&
				prevTimeline !== undefined &&
				prevTimeline.playing === !paused &&
				prevTimeline.durationMs === duration &&
				Math.abs(positionOf(prevTimeline) - polled) <= RESYNC_THRESHOLD_MS;
			const timeline: Timeline = keepTimeline
				? prevTimeline
				: { baseMs: polled, baseAt: Date.now(), durationMs: duration, playing: !paused };

			// Ne PAS repartir a la position 0 ici : le scroll est deja gere par
			// tickScroll() toutes les 400ms. Rappeler scrollText(title, 0) a
			// chaque poll (1.5s) l'ecrasait et faisait "sauter" le texte au debut.
			const state: DialState = trackChanged
				? {
						trackKey,
						curTitle: title,
						curArtist: artist,
						mode: "normal",
						nextTitle: "",
						nextArtist: "",
						nextRequested: false,
						title: makeFieldState(title),
						artist: makeFieldState(artist),
						paused,
						timeline,
						shownElapsed: ""
					}
				: previous;
			state.paused = paused;
			state.timeline = timeline;
			this.dialState.set(visibleAction.id, state);
			this.maybeFetchNext(visibleAction.id, state);
			syncMode(state);

			const time = timeFeedback(timeline);
			state.shownElapsed = time.elapsed;

			await visibleAction.setFeedback({
				title: titleFeedback(state),
				artist: artistFeedback(state),
				pauseIcon: { enabled: paused },
				...time,
				...(data.thumbnail && data.thumbMime ? { cover: `data:${data.thumbMime};base64,${data.thumbnail}` } : {})
			});
		}
	}

	/** Lance (une seule fois par morceau) la lecture de la file d'attente quand la fin du morceau approche. */
	private maybeFetchNext(id: string, state: DialState): void {
		if (state.nextRequested || this.showNext.get(id) === false) {
			return;
		}
		if (state.timeline.durationMs < MIN_TEASER_DURATION_MS || remainingMs(state) > FETCH_AT_MS) {
			return;
		}
		state.nextRequested = true;
		void this.fetchNext(id, state.trackKey);
	}

	/** Lit le prochain titre de la file d'attente (le pont ouvre brievement le panneau File d'attente d'Apple Music). */
	private async fetchNext(id: string, trackKey: string): Promise<void> {
		const [title, artist] = (await nowPlayingService.uiControl("NextTrack")).split("	");
		const state = this.dialState.get(id);
		const dial = [...this.actions].find((a) => a.id === id);
		if (!state || state.trackKey !== trackKey || !dial?.isDial()) {
			return;
		}
		streamDeck.logger.info(`next track read: ${title ? `"${title}"` : "none"}`);
		state.nextTitle = title ?? "";
		state.nextArtist = artist ?? "";
		// Si on est deja dans la fenetre d'annonce, on l'affiche tout de suite.
		if (syncMode(state)) {
			await dial.setFeedback({ title: titleFeedback(state), artist: artistFeedback(state) });
		}
	}

	private ensureScrollTimer(): void {
		if (this.scrollTimer) {
			return;
		}
		this.scrollTimer = setInterval(() => void this.tickScroll(), SCROLL_INTERVAL_MS);
	}

	private stopScrollTimer(): void {
		if (this.scrollTimer) {
			clearInterval(this.scrollTimer);
			this.scrollTimer = null;
		}
	}

	private async tickScroll(): Promise<void> {
		for (const visibleAction of this.actions) {
			if (!visibleAction.isDial()) {
				continue;
			}
			const state = this.dialState.get(visibleAction.id);
			if (!state || state.paused) {
				continue;
			}

			this.maybeFetchNext(visibleAction.id, state);
			const modeChanged = syncMode(state);
			const time = timeFeedback(state.timeline);
			const timeChanged = time.elapsed !== state.shownElapsed;
			state.shownElapsed = time.elapsed;

			if (modeChanged) {
				await visibleAction.setFeedback({ ...time, title: titleFeedback(state), artist: artistFeedback(state) });
				continue;
			}
			const titleChanged = tickField(state.title, titleSpec(state));
			const artistChanged = tickField(state.artist, ARTIST_SPEC);
			if (!titleChanged && !artistChanged && !timeChanged) {
				continue;
			}
			await visibleAction.setFeedback({
				...(timeChanged ? time : {}),
				...(titleChanged ? { title: scrollText(state.title.text, state.title.pos, titleSpec(state)) } : {}),
				...(artistChanged ? { artist: artistFeedback(state) } : {})
			});
		}
	}
}
