const clientId = "33c276b6719a4a64b6cc3d0cb518e727"; // Replace with your client id
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
const redirect_uri = "http://127.0.0.1:5173/"

let token: string | null = null;
let player: any = null;
let deviceId: string | null = null;
let currentPlaylist: string | null = null;

if (!code) {
    console.log("No code found, starting auth code flow...");
    redirectToAuthCodeFlow(clientId);
} else {
    console.log("Code found, getting access token...");
    const accessToken = await getAccessToken(clientId, code);
    token = accessToken;
    localStorage.setItem("token", token);
    const profile = await fetchProfile(accessToken);
    console.log(profile); // Profile data logs to console
    populateUI(profile);
    initPlayer();
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
function initPlayer() {
    document.getElementById("player-section")!.style.display = "block";
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
        player = new Spotify.Player({
            name: "Vanilla TS Spotify Player",
            getOAuthToken: cb => cb(token!),
            volume: 0.5
        });

        player.addListener("ready", ({ device_id }) => {
            deviceId = device_id;
            console.log("Player ready! Device ID:", deviceId);
        });

        player.connect();
    };

    document.getElementById("add-playlist-btn")!.addEventListener("click", () => {
        const input = document.getElementById("playlist-input") as HTMLInputElement;
        const playlistUri = input.value.trim();
        if (!playlistUri || !deviceId) return;
        currentPlaylist = playlistUri;
        document.getElementById("current-playlist")!.innerText = `Current playlist: ${currentPlaylist}`;
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ context_uri: playlistUri })
        });
    });

    document.getElementById("play-btn")!.addEventListener("click", () => {
        if (!deviceId) return;
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` }
        });
    });
}