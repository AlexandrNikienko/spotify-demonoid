import { getValidAccessToken } from "./auth";
import { fetchPlaylistTracks, fetchUserPlaylists, playTrackAtPosition } from "./spotifyApi";
import { getRandomBetween } from "./utils";

let currentDeviceId: string | null = null;

export function setupSpotifyPlayer(clientId: string, appStarted: boolean) {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
        const player = new (window as any).Spotify.Player({
            name: "Demonoid Player",
            getOAuthToken: async (cb: (token: string) => void) => {
                const token = await getValidAccessToken(clientId, appStarted);
                cb(token);
            },
            volume: 0.05,
        });

        player.addListener("initialization_error", ({ message }: any) => { console.error(message); });
        player.addListener("authentication_error", ({ message }: any) => { console.error(message); });
        player.addListener("account_error", ({ message }: any) => { console.error(message); });
        player.addListener("playback_error", ({ message }: any) => { console.error(message); });

        player.addListener("ready", ({ device_id }: any) => {
            currentDeviceId = device_id;
            console.log("🎧 Spotify player ready:", device_id);
        });

        player.addListener("player_state_changed", (state: any) => {
            if (!state) return;
            const track = state.track_window.current_track;
            if (track) {
                const titleEl = document.getElementById("track-title");
                titleEl!.textContent = `${track.name} — ${track.artists.map((a: any) => a.name).join(", ")}`;
            }
        });

        player.connect();
        player.activateElement();

        (window as any).player = player;

        initPlayer(clientId, appStarted)
    };
}

export function getCurrentDeviceId() {
    return currentDeviceId;
}

async function initPlayer(clientId: string, appStarted: boolean) {
    let skipTimeoutId: number | null = null;
    let isPlaying = false;
    let currentPlaylistId: string | null = null;
    let playlistTracks: string[] = [];
    let currentTrackIndex = 0;

    const playlistInput = document.getElementById("playlist-input") as HTMLInputElement;
    const addBtn = document.getElementById("add-playlist-btn")!;
    const select = document.getElementById("playlist-select") as HTMLSelectElement;
    const loadBtn = document.getElementById("load-playlist-btn")!;
    const playBtn = document.getElementById("play-btn")!;
    const stopBtn = document.getElementById("stop-btn")!;
    const skipIntervalInput = document.getElementById("skip-interval-input") as HTMLInputElement;
    const iframe = document.getElementById("spotify-player") as HTMLIFrameElement;
    const token = await getValidAccessToken(clientId, appStarted);

    await loadUserPlaylists(token);

    addBtn.addEventListener("click", async () => {
        const playlistId = playlistInput.value.trim() || "0lpqMVvMwCNpfzqX2RSBCM"; // MK playlist as default
        await loadPlaylist(playlistId);
    });

    loadBtn.addEventListener("click", async () => {
        const playlistId = select.value;
        await loadPlaylist(playlistId);
    });

    playBtn.addEventListener("click", async () => {
        const token = await getValidAccessToken(clientId, appStarted);
        if (!currentPlaylistId || playlistTracks.length === 0 || !token || !currentDeviceId) {
            alert("PlayBtn click: Playlist or token not ready!");
            return;
        }

        if (skipTimeoutId) clearTimeout(skipTimeoutId);
        isPlaying = true;

        // Start auto-skip loop
        await autoSkipToNextTrack(true);
    });

    // Stop button
    stopBtn.addEventListener("click", async () => {
        const token = await getValidAccessToken(clientId, appStarted);
        if (!token || !currentDeviceId) {
            alert("StopBtn click: Player not ready!");
            return;
        }
        isPlaying = false;
        if (skipTimeoutId) clearTimeout(skipTimeoutId);

        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${currentDeviceId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("🛑 Playback stopped");
    });

    async function loadPlaylist(playlistId: string) {
        console.log("Show loader - Loading playlist:", playlistId);
        if (!playlistId) {
            alert("Please select or enter a playlist!");
            return;
        }

        currentPlaylistId = playlistId;
        playlistTracks = await fetchPlaylistTracks(playlistId, token);
        currentTrackIndex = 0;
        iframe.src = `https://open.spotify.com/embed/playlist/${playlistId}`;
    }

    // Recursive auto-skip with random delay
    async function autoSkipToNextTrack(isFirst = false) {
        if (!isPlaying || !playlistTracks.length) return;
        if (!currentDeviceId) {
            console.warn("Player not ready yet, retrying in 2s...");
            setTimeout(() => autoSkipToNextTrack(isFirst), 2000);
            return;
        }

        const playOptions = ["nextWithSeek", "play"];
        let choice = playOptions[getRandomBetween(0, playOptions.length - 1)];

        if (!isFirst) {
            currentTrackIndex = (currentTrackIndex + 1) % playlistTracks.length;
        } else {
            choice = "play";
        }

        const trackUri = playlistTracks[currentTrackIndex];

        //console.log(`➡️ Track #${currentTrackIndex + 1} choice: ${choice}`);

        choice = "play"; // TEMP: force play mode for testing

        switch (choice) {
            case "nextWithSeek":
                console.log(`⏭️ Skipping to next track: #${currentTrackIndex + 1}`);
                await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${currentDeviceId}`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${await getValidAccessToken(clientId, appStarted)}` },
                });

                if (getRandomBetween(0, 1) === 1) {
                    const randomStart = getRandomBetween(120, 240) * 1000;
                    setTimeout(async () => {
                        console.log(`⏩ Seeking to ${randomStart / 1000}s`);
                        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${randomStart}&device_id=${currentDeviceId}`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${await getValidAccessToken(clientId, appStarted)}` },
                        });
                    }, 20000);
                }

                break;

            case "play":
                const randomStart = Number(skipIntervalInput.value.trim()) || getRandomBetween(0, 120) * 1000;
                console.log(`▶️ Playing track #${currentTrackIndex + 1} at ${randomStart / 1000}s`);
                await playTrackAtPosition(trackUri, randomStart, token, currentDeviceId);
                break;

            case "finish":
                console.log("🚩 Finish mode — waiting for track end event instead of skipping.");
                break;
        }

        const delay = getRandomBetween(120, 180);
        console.log(`⏭️ Next skip in ${delay}s`);
        skipTimeoutId = setTimeout(() => autoSkipToNextTrack(false), delay * 1000);
    }

    // Fetch user's playlists
    async function loadUserPlaylists(token: string) {
        const data = await fetchUserPlaylists(token);
        console.log("User playlists:", data);
        const playlists = data?.items || [];
        const select = document.getElementById("playlist-select") as HTMLSelectElement;

        select.innerHTML = `<option value="">--Select a playlist--</option>`;
        playlists.forEach(pl => {
            const option = document.createElement("option");
            option.value = pl.id;
            option.innerText = pl.name;
            select.appendChild(option);
        });
    }
}
