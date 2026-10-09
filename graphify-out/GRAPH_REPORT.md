# Graph Report - streamdeck-applemusic-nowplaying  (2026-10-10)

## Corpus Check
- 21 files · ~11,481 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .exe 2, .WinMD 1)

## Summary
- 319 nodes · 511 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b40b888`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- plugin.ts
- IAudioSessionControl2
- NowPlayingBridge.cs
- now-playing.ts
- package.json
- Apple Music Now Playing README (English)
- make-icons.mjs
- manifest.json
- NowPlayingBridge
- compilerOptions
- action
- com.alexisvscsharp.nowplaying.sdPlugin/package.json
- AppleMusicUi
- FavoriteAction
- Apple Music Now Playing README (French)
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `Apple Music Now Playing README (English)` - 19 edges
2. `NowPlayingAction` - 15 edges
3. `IAudioSessionControl2` - 15 edges
4. `Apple Music Now Playing README (French)` - 15 edges
5. `nowPlayingService` - 14 edges
6. `compilerOptions` - 13 edges
7. `withBrandBackground()` - 12 edges
8. `IAudioSessionControl` - 11 edges
9. `NowPlayingBridge` - 10 edges
10. `FavoriteAction` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Apple Music Now Playing README (English)` --references--> `Apple Music Now Playing README (French)`  [EXTRACTED]
  README.md → README.fr.md
- `fits()` --calls--> `textWidthPx()`  [EXTRACTED]
  src/actions/now-playing.ts → src/text-metrics.ts
- `scrollText()` --calls--> `textWidthPx()`  [EXTRACTED]
  src/actions/now-playing.ts → src/text-metrics.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Windows Bridging via NowPlayingBridge.exe (French)** — readme_fr_nowplayingbridge_exe, readme_fr_smtc, readme_fr_core_audio, readme_fr_ui_automation [EXTRACTED 1.00]
- **Launch Playlist/Album Playback Flow** — readme_launch_playlist_album, readme_music_protocol, readme_ui_automation [EXTRACTED 1.00]
- **Windows Bridging via NowPlayingBridge.exe (English)** — readme_nowplayingbridge_exe, readme_smtc, readme_core_audio, readme_ui_automation [EXTRACTED 1.00]

## Communities (16 total, 3 thin omitted)

### Community 0 - "plugin.ts"
Cohesion: 0.07
Nodes (22): @elgato/streamdeck, ref_node_child_process, ref_node_events, ref_node_path, ref_node_readline, MuteAction, action, BRIDGE_PATH (+14 more)

### Community 1 - "IAudioSessionControl2"
Cohesion: 0.07
Nodes (6): IAudioSessionControl, IAudioSessionControl2, IAudioSessionManager2, ISimpleAudioVolume, Guid, IntPtr

### Community 2 - "NowPlayingBridge.cs"
Cohesion: 0.09
Nodes (15): AppleMusicVolume, IAudioSessionEnumerator, IMMDevice, IMMDeviceCollection, IMMDeviceEnumerator, List, system, system_collections_generic (+7 more)

### Community 3 - "now-playing.ts"
Cohesion: 0.10
Nodes (21): action, ARTIST_SPEC, cleanArtist(), DialState, FieldState, fits(), formatArtists(), formatTime() (+13 more)

### Community 4 - "package.json"
Cohesion: 0.08
Nodes (24): dependencies, @elgato/streamdeck, description, license, name, private, scripts, build (+16 more)

### Community 5 - "Apple Music Now Playing README (English)"
Cohesion: 0.18
Nodes (17): Apple Music Now Playing README (English), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Corsair Galleon 100 SD, Keypad Buttons Feature, Launch Playlist/Album Button Feature, MIT License (excluding Apple Music icons), music:// Protocol (+9 more)

### Community 6 - "make-icons.mjs"
Cohesion: 0.16
Nodes (24): ref_node_zlib, chunk(), crc32(), CRC_TABLE, drawSpeaker(), encodePng(), heartFilledIcon(), heartIcon() (+16 more)

### Community 7 - "manifest.json"
Cohesion: 0.12
Nodes (16): Actions, Author, Category, CategoryIcon, CodePath, Description, Icon, Name (+8 more)

### Community 8 - "NowPlayingBridge"
Cohesion: 0.23
Nodes (7): EntryPoint, NowPlayingBridge, GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager, IAsyncOperation, IAsyncOperationWithProgress, StringBuilder

### Community 9 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, resolveJsonModule (+6 more)

### Community 12 - "AppleMusicUi"
Cohesion: 0.38
Nodes (4): AutomationElement, AppleMusicUi, DllImport, UIntPtr

### Community 14 - "Apple Music Now Playing README (French)"
Cohesion: 0.23
Nodes (13): Apple Music Now Playing README (French), Apple Music for Windows, Core Audio (ISimpleAudioVolume), Keypad Buttons Feature, Launch Playlist/Album Button Feature, music:// Protocol, Now Playing Dial Feature, NowPlayingBridge.exe (+5 more)

### Community 15 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @elgato/cli, @resvg/resvg-js, rollup, @rollup/plugin-commonjs, @rollup/plugin-node-resolve, @rollup/plugin-terser, @rollup/plugin-typescript (+2 more)

## Knowledge Gaps
- **76 isolated node(s):** `NowPlayingSettings`, `FieldState`, `Timeline`, `DialState`, `ScrollSpec` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@elgato/streamdeck` connect `plugin.ts` to `now-playing.ts`, `package.json`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `Apple Music Now Playing README (English)` connect `Apple Music Now Playing README (English)` to `NowPlayingBridge.cs`, `Apple Music Now Playing README (French)`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `IAudioSessionControl2` connect `IAudioSessionControl2` to `NowPlayingBridge.cs`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `NowPlayingSettings`, `FieldState`, `Timeline` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `plugin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0726950354609929 - nodes in this community are weakly interconnected._
- **Should `IAudioSessionControl2` be split into smaller, more focused modules?**
  _Cohesion score 0.07152496626180836 - nodes in this community are weakly interconnected._
- **Should `NowPlayingBridge.cs` be split into smaller, more focused modules?**
  _Cohesion score 0.08912655971479501 - nodes in this community are weakly interconnected._