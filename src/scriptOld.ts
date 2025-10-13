// let appStarted = false;
// const clientId = "33c276b6719a4a64b6cc3d0cb518e727";

// let redirect_uri: string;

// if (window.location.hostname === "127.0.0.1") {
//     console.log("Running on localhost");
//     redirect_uri = "http://127.0.0.1:5173/";
// } else {
//     console.log("Running in production");
//     redirect_uri = "https://spotify-demonoid.netlify.app/";
// }

// const welcomeScreen = document.getElementById("welcome-screen")!;
// const app = document.getElementById("app")!;
// const startBtn = document.getElementById("start-btn")!;

// startBtn.addEventListener("click", () => {
//     appStarted = true;
//     welcomeScreen.style.display = "none";
//     redirectToAuthCodeFlow(clientId);
// });

(async () => {
    //Show welcome screen first
    // const hasToken = localStorage.getItem("access_token");
    // const params = new URLSearchParams(window.location.search);
    // const code = params.get("code");

    // if (!hasToken && !code) {
    //     console.log("🕒 Waiting for user to click Start...");
    //     welcomeScreen.style.display = "block";
    //     app.style.display = "none";
    //     return;
    // }

    // appStarted = true;

    let profile = await checkToken(hasToken);

    if (!profile && code) {
        const accessToken = await getAccessToken(clientId, code);
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("access_token_expiry", (Date.now() + 3600 * 1000).toString());
        profile = await fetchProfile(accessToken);
    }

    // if (!profile || (profile as any).error) {
    //     console.log("No valid token, starting auth flow...", profile);
    //     return
    //     //redirectToAuthCodeFlow(clientId);
    // } else {
        // Hide welcome, show main UI
        // document.getElementById("welcome-screen")!.style.display = "none";
        // app!.style.display = "block";

        // populateUI(profile);
        // initPlayer();
        window.history.replaceState({}, document.title, redirect_uri);

        // keep refresh + reconnect
        // setInterval(async () => {
        //     const newToken = await refreshAccessToken(clientId);
        //     if (newToken) {
        //         console.log("Token refreshed automatically");
        //         if ((window as any).player) {
        //             (window as any).player.connect();
        //             (window as any).player.activateElement();
        //         }
        //     }
        // }, 50 * 60 * 1000);
    }
})();

//Access to player
// const script = document.createElement("script");
// script.src = "https://sdk.scdn.co/spotify-player.js";
// script.async = true;
// document.body.appendChild(script);

// Spotify Web Playback SDK requires this global function
// let currentDeviceId: string | null = null;

// (window as any).onSpotifyWebPlaybackSDKReady = () => {
//     const player = new (window as any).Spotify.Player({
//         name: "Web Player",
//         getOAuthToken: async (cb: (token: string) => void) => {
//             const freshToken = await getValidAccessToken();
//             cb(freshToken);
//         },
//         volume: 0.005 //TODO: make adjustable
//     });

//     // Save device ID when ready
//     player.addListener("ready", ({ device_id }: any) => {
//         console.log("Spotify Player ready with device ID", device_id);
//         currentDeviceId = device_id;
//     });

//     // Optional: handle errors
//     player.addListener("initialization_error", ({ message }: any) => { console.error(message); });
//     player.addListener("authentication_error", ({ message }: any) => { console.error(message); });
//     player.addListener("account_error", ({ message }: any) => { console.error(message); });
//     player.addListener("playback_error", ({ message }: any) => { console.error(message); });

//     player.addListener('player_state_changed', (state: any) => {
//         if (!state) return;

//         const track = state.track_window.current_track;
//         const titleEl = document.getElementById("track-title");

//         if (track && titleEl) {
//             const artistNames = track.artists.map((a: any) => a.name).join(", ");
//             titleEl.textContent = `${track.name} — ${artistNames}`;
//         }
//     });

//     // Connect!
//     player.connect();
//     player.activateElement();
// };

// async function getValidAccessToken(): Promise<string> {
//     const token = localStorage.getItem("access_token");
//     const expiry = Number(localStorage.getItem("access_token_expiry"));

//     if (token && expiry > Date.now()) {
//         return token;
//     }

//     console.warn("Access token expired — refreshing...");
//     const newToken = await refreshAccessToken(clientId);
//     if (newToken) return newToken;

//     console.warn("Refresh failed, starting new auth flow...");
//     if (appStarted) {
//         redirectToAuthCodeFlow(clientId);
//     } else {
//         console.log("⏸️ Skipping auth redirect until Start pressed.");
//     }
//     throw new Error("Unable to refresh access token — restarting auth");
// }

async function checkToken(token: string | null) {
    if (!token) return null;

    const expiry = Number(localStorage.getItem("access_token_expiry"));
    if (!expiry || expiry <= Date.now()) {
        console.warn("Stored token expired, refreshing...");
        const newToken = await refreshAccessToken(clientId);
        if (!newToken) return null;
        token = newToken;
    }

    try {
        const profile = await fetchProfile(token);
        return profile;
    } catch (err) {
        console.warn("Token invalid, clearing it.", err);
        localStorage.removeItem("access_token");
        localStorage.removeItem("access_token_expiry");
        return null;
    }
}

/////

function logoutHandler() {
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        console.log("Logging out...");

        // Clear all stored tokens
        // localStorage.removeItem("access_token");
        // localStorage.removeItem("access_token_expiry");
        // localStorage.removeItem("refresh_token");
        // localStorage.removeItem("verifier");

        // Optionally, clear UI elements
        document.getElementById("displayName")!.textContent = "";
        document.getElementById("avatar")!.innerHTML = "";

        // Redirect to homepage or restart auth
        // window.location.href = redirect_uri;
    });
}

// export async function redirectToAuthCodeFlow(clientId: string) {
//     console.log("Redirecting to auth code flow...");
//     const verifier = generateCodeVerifier(128);
//     const challenge = await generateCodeChallenge(verifier);

//     localStorage.setItem("verifier", verifier);

//     const params = new URLSearchParams();
//     params.append("client_id", clientId);
//     params.append("response_type", "code");
//     params.append("redirect_uri", redirect_uri);
//     params.append("scope", "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state");
//     params.append("code_challenge_method", "S256");
//     params.append("code_challenge", challenge);

//     document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
// }

// function generateCodeVerifier(length: number) {
//     console.log("Generating code verifier...");
//     let text = '';
//     let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

//     for (let i = 0; i < length; i++) {
//         text += possible.charAt(Math.floor(Math.random() * possible.length));
//     }
//     return text;
// }

// async function generateCodeChallenge(codeVerifier: string) {
//     console.log("Generating code challenge...");
//     const data = new TextEncoder().encode(codeVerifier);
//     const digest = await window.crypto.subtle.digest('SHA-256', data);
//     return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
//         .replace(/\+/g, '-')
//         .replace(/\//g, '_')
//         .replace(/=+$/, '');
// }

// export async function getAccessToken(clientId: string, code: string): Promise<string> {
//     //TODO show loader on UI
//     console.log("Getting access token...");
//     const verifier = localStorage.getItem("verifier");

//     const params = new URLSearchParams();
//     params.append("client_id", clientId);
//     params.append("grant_type", "authorization_code");
//     params.append("code", code);
//     params.append("redirect_uri", redirect_uri);
//     params.append("code_verifier", verifier!);

//     const result = await fetch("https://accounts.spotify.com/api/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: params
//     });

//     const data = await result.json();
//     console.log("Token response:", data);

//     if (data.access_token) {
//         localStorage.setItem("access_token", data.access_token);
//         localStorage.setItem("access_token_expiry", (Date.now() + data.expires_in * 1000).toString());
//     }
//     if (data.refresh_token) {
//         localStorage.setItem("refresh_token", data.refresh_token);
//     }

//     return data.access_token;
// }

// async function refreshAccessToken(clientId: string): Promise<string | null> {
//     const refreshToken = localStorage.getItem("refresh_token");
//     if (!refreshToken) {
//         console.warn("No refresh token found");
//         return null;
//     }

//     console.log("Refreshing access token...");
//     const params = new URLSearchParams();
//     params.append("grant_type", "refresh_token");
//     params.append("refresh_token", refreshToken);
//     params.append("client_id", clientId);

//     const result = await fetch("https://accounts.spotify.com/api/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: params
//     });

//     const data = await result.json();
//     console.log("Refresh response:", data);

//     if (data.access_token) {
//         localStorage.setItem("access_token", data.access_token);
//         localStorage.setItem("access_token_expiry", (Date.now() + data.expires_in * 1000).toString());
//         if (data.refresh_token) {
//             localStorage.setItem("refresh_token", data.refresh_token);
//         }
//         return data.access_token;
//     }
//     return null;
// }

// async function fetchProfile(token: string): Promise<UserProfile> {
//     //TODO show loader on UI
//     console.log("Fetching profile...");
//     const result = await fetch("https://api.spotify.com/v1/me", {
//         method: "GET", headers: { Authorization: `Bearer ${token}` }
//     });

//     return await result.json();
// }

// function populateUI(profile: UserProfile) {
//     //TODO show loader on UI
//     console.log("Populating UI... with profile", profile);
//     document.getElementById("displayName")!.innerText = profile.display_name;
//     if (profile.images && profile.images.length > 0) {
//         const profileImage = new Image(30, 30);
//         profileImage.src = profile.images[0].url;
//         document.getElementById("avatar")!.appendChild(profileImage);
//     }
//     document.getElementById("email")!.innerText = profile.email;
//     document.getElementById("uri")!.innerText = profile.uri;
//     document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
//     document.getElementById("uri")!.setAttribute("target", "blank");

//     logoutHandler();
// }

// ===== PLAYER =====
async function initPlayer() {
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

    // Load user's playlists into dropdown
    const token = await getValidAccessToken();
    await loadUserPlaylists(token);

    // Add playlist manually
    addBtn.addEventListener("click", async () => {
        const playlistId = playlistInput.value.trim() || "0lpqMVvMwCNpfzqX2RSBCM"; // MK playlist as default
        await loadPlaylist(playlistId);
    });

    // Load playlist from dropdown
    loadBtn.addEventListener("click", async () => {
        const playlistId = select.value;
        await loadPlaylist(playlistId);
    });

    // Play button
    playBtn.addEventListener("click", async () => {
        const token = await getValidAccessToken();
        if (!currentPlaylistId || playlistTracks.length === 0 || !token || !currentDeviceId) {
            alert("PlayBtn click: Playlist or token not ready!");
            return;
        }

        if (skipTimeoutId) clearTimeout(skipTimeoutId);
        isPlaying = true;

        // Sync iframe preview
        //iframe.src = `https://open.spotify.com/embed/track/${playlistTracks[currentTrackIndex].split(":").pop()}`;

        // Start auto-skip loop
        await autoSkipToNextTrack(true);
    });

    // Stop button
    stopBtn.addEventListener("click", async () => {
        const token = await getValidAccessToken();
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
        if (!playlistId) {
            alert("Please select or enter a playlist!");
            return;
        }

        currentPlaylistId = playlistId;
        playlistTracks = await fetchPlaylistTracks(playlistId);
        currentTrackIndex = 0;
        iframe.src = `https://open.spotify.com/embed/playlist/${playlistId}`;
    }

    // function getRandomBetween(min: number, max: number): number {
    //     return Math.floor(Math.random() * (max - min + 1)) + min;
    // }

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
                    headers: { Authorization: `Bearer ${await getValidAccessToken()}` },
                });

                if (getRandomBetween(0, 1) === 1) {
                    const randomStart = getRandomBetween(120, 240) * 1000;
                    setTimeout(async () => {
                        console.log(`⏩ Seeking to ${randomStart / 1000}s`);
                        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${randomStart}&device_id=${currentDeviceId}`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${await getValidAccessToken()}` },
                        });
                    }, 20000);
                }

                break;

            case "play":
                const randomStart = Number(skipIntervalInput.value.trim()) || getRandomBetween(0, 120) * 1000;
                console.log(`▶️ Playing track #${currentTrackIndex + 1} at ${randomStart / 1000}s`);
                await playTrackAtPosition(trackUri, randomStart);

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
        const select = document.getElementById("playlist-select") as HTMLSelectElement;
        // const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        //     headers: { "Authorization": `Bearer ${token}` }
        // });

        if (!response.ok) {
            console.error("Failed to fetch playlists", await response.text());
            return;
        }

        // const data = await response.json();
        const playlists = data.items as { name: string; id: string }[];

        select.innerHTML = `<option value="">--Select a playlist--</option>`;
        playlists.forEach(pl => {
            const option = document.createElement("option");
            option.value = pl.id;
            option.innerText = pl.name;
            select.appendChild(option);
        });
    }

    // // Fetch all track URIs for a playlist
    // async function fetchPlaylistTracks(playlistId: string): Promise<string[]> {
    //     let tracks: string[] = [];
    //     let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

    //     const token = await getValidAccessToken();

    //     while (url) {
    //         const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    //         if (!res.ok) throw new Error("Failed to fetch playlist tracks");
    //         const data = await res.json();
    //         tracks.push(...data.items.map((item: any) => item.track.uri));
    //         url = data.next;
    //     }

    //     return tracks;
    // }

    // Play specific track at given position
    async function playTrackAtPosition(trackUri: string, positionMs: number) {
        const token = await getValidAccessToken();

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ uris: [trackUri], position_ms: positionMs })
        });
    }
}
