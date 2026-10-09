import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { nowPlayingService, NowPlayingPayload } from "../now-playing-service";

/**
 * Apple Music n'expose l'etat "favori" qu'en ouvrant son menu, ce qui prend le focus clavier :
 * impossible de le lire en continu sans gener l'utilisateur. L'icone montre donc le resultat
 * du dernier appui sur le titre en cours (le pont lit l'etat reel puis le bascule), et repart
 * a "coeur vide" quand le titre change.
 */
@action({ UUID: "com.alexisvscsharp.nowplaying.favorite" })
export class FavoriteAction extends SingletonAction {
	private trackKey = "";
	private onUpdate = (data: NowPlayingPayload) => void this.syncTrack(data);

	override async onWillAppear(): Promise<void> {
		if ([...this.actions].length === 1) {
			nowPlayingService.on("update", this.onUpdate);
		}
		nowPlayingService.acquire();
		void this.syncTrack(nowPlayingService.latest);
	}

	override onWillDisappear(): void {
		nowPlayingService.release();
		if ([...this.actions].length === 0) {
			nowPlayingService.off("update", this.onUpdate);
		}
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		const output = await nowPlayingService.uiControl("FavoriteToggle");
		if (output !== "true" && output !== "false") {
			await ev.action.showAlert();
			return;
		}
		await this.setAll(output === "true" ? 1 : 0);
	}

	private async syncTrack(data: NowPlayingPayload): Promise<void> {
		const key = data.hasSession ? `${data.title}|${data.artist}` : "";
		if (key === this.trackKey) {
			return;
		}
		this.trackKey = key;
		await this.setAll(0);
	}

	private async setAll(state: 0 | 1): Promise<void> {
		for (const visibleAction of this.actions) {
			if (visibleAction.isKey()) {
				await visibleAction.setState(state);
			}
		}
	}
}
