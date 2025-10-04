const clientId = "33c276b6719a4a64b6cc3d0cb518e727"; // Replace with your client id
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
const redirect_uri = "http://127.0.0.1:5173/"

let storedToken = localStorage.getItem("access_token");
const storedExpiry = localStorage.getItem("access_token_expiry");

//Access to player
const script = document.createElement("script");
script.src = "https://sdk.scdn.co/spotify-player.js";
script.async = true;
document.body.appendChild(script);

// Spotify Web Playback SDK requires this global function
(window as any).onSpotifyWebPlaybackSDKReady = () => {
    const player = new (window as any).Spotify.Player({
        name: "Web Player",
        getOAuthToken: (cb: (token: string) => void) => { cb(storedToken!); },
        volume: 0.5
    });

    // Save device ID when ready
    player.addListener("ready", ({ device_id }: any) => {
        console.log("Spotify Player ready with device ID", device_id);
        currentDeviceId = device_id;
    });

    // Optional: handle errors
    player.addListener("initialization_error", ({ message }: any) => { console.error(message); });
    player.addListener("authentication_error", ({ message }: any) => { console.error(message); });
    player.addListener("account_error", ({ message }: any) => { console.error(message); });
    player.addListener("playback_error", ({ message }: any) => { console.error(message); });

    // Connect!
    player.connect();
};


// Check token validity
if (storedToken && storedExpiry && Number(storedExpiry) > Date.now()) {
    console.log("Using stored access token");

    const profile = await fetchProfile(storedToken);
    populateUI(profile);
    initPlayer();

    // Remove code from URL
    window.history.replaceState({}, document.title, "/");
} else if (code) {
    console.log("Code found, exchanging for access token...");
    const accessToken = await getAccessToken(clientId, code);

    // Save token and expiry (default Spotify token = 3600s)
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("access_token_expiry", (Date.now() + 3600 * 1000).toString());

    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    initPlayer();

    // Remove code from URL
    window.history.replaceState({}, document.title, "/");
} else {
    console.log("No valid token, starting auth flow...");
    redirectToAuthCodeFlow(clientId);
}


export async function redirectToAuthCodeFlow(clientId: string) {
    console.log("Redirecting to auth code flow...");
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirect_uri);
    params.append("scope", "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    console.log("Generating code verifier...");
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    console.log("Generating code challenge...");
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    console.log("Getting access token...");
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirect_uri);
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token: string): Promise<UserProfile> {
    console.log("Fetching profile...");
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUI(profile: UserProfile) {
    console.log("Populating UI...");
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

// ===== PLAYER =====



let skipIntervalId: number | null = null;
//let currentToken: string | null = null;
let currentDeviceId: string | null = null;
let currentPlaylistId: string | null = null;

function initPlayer() {
    const addBtn = document.getElementById("add-playlist-btn")!;
    const playlistInput = document.getElementById("playlist-input") as HTMLInputElement;
    const playBtn = document.getElementById("play-btn")!;
    const stopBtn = document.getElementById("stop-btn")!;
    const skipIntervalInput = document.getElementById("skip-interval-input") as HTMLInputElement;
    const iframe = document.getElementById("spotify-player") as HTMLIFrameElement;

    addBtn.addEventListener("click", () => {
        let uri = playlistInput.value.trim();
        if (!uri) uri = "0ungUIGINFk2xsBMFAeguv" // whrrr at Jose;    "0lpqMVvMwCNpfzqX2RSBCM"; // default playlist 

        currentPlaylistId = uri;

        // Convert URI (spotify:playlist:ID) to embed URL
        //let playlistId = uri.split(":")[2]; // 'spotify:playlist:ID'
        iframe.src = `https://open.spotify.com/embed/playlist/${uri}`;
    });


    // Play button with auto-skip functionality
    playBtn.addEventListener("click", async () => {
        if (!currentPlaylistId) {
            alert("Add a playlist first!");
            return;
        }
        if (!storedToken || !currentDeviceId) {
            alert("Player not ready yet!");
            return;
        }

        // Play playlist on your Spotify Web Playback SDK device
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${storedToken}`
            },
            body: JSON.stringify({ context_uri: `spotify:playlist:${currentPlaylistId}` })
        });

        // Clear previous interval if exists
        if (skipIntervalId) clearInterval(skipIntervalId);

        // Start auto skip
        const skipSeconds = Number(skipIntervalInput.value) || 60; // default 60s
        skipIntervalId = window.setInterval(() => {
            fetch(`https://api.spotify.com/v1/me/player/next?device_id=${currentDeviceId}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${storedToken}` }
            });
        }, skipSeconds * 1000);
    });

    stopBtn.addEventListener("click", async () => {
        if (!storedToken || !currentDeviceId) return;

        // Stop playback
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${currentDeviceId}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${storedToken}` }
        });

        // Clear auto-skip interval
        if (skipIntervalId) {
            clearInterval(skipIntervalId);
            skipIntervalId = null;
        }
    });
}