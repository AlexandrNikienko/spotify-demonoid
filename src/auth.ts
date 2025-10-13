export let redirect_uri: string;

if (window.location.hostname === "127.0.0.1") {
    console.log("Running on localhost");
    redirect_uri = "http://127.0.0.1:5173/";
} else {
    console.log("Running in production");
    redirect_uri = "https://spotify-demonoid.netlify.app/";
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
    //TODO show loader - getAccessToken
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

    const data = await result.json();
    console.log("Token response:", data);

    if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("access_token_expiry", (Date.now() + data.expires_in * 1000).toString());
    }
    if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
    }

    return data.access_token;
}

export async function refreshAccessToken(clientId: string): Promise<string | null> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
        console.warn("No refresh token found");
        return null;
    }

    console.log("Refreshing access token...");
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", clientId);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const data = await result.json();
    console.log("Refresh response:", data);

    if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("access_token_expiry", (Date.now() + data.expires_in * 1000).toString());
        if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
        }
        return data.access_token;
    }
    return null;
}

export async function getValidAccessToken(clientId: string, appStarted: boolean): Promise<string> {
    const token = localStorage.getItem("access_token");
    const expiry = Number(localStorage.getItem("access_token_expiry"));

    if (token && expiry > Date.now()) {
        return token;
    }

    console.warn("Access token expired — refreshing...");
    const newToken = await refreshAccessToken(clientId);
    if (newToken) return newToken;

    console.warn("Refresh failed, starting new auth flow...");
    if (appStarted) {
        redirectToAuthCodeFlow(clientId);
    } else {
        console.log("⏸️ Skipping auth redirect until Start pressed.");
    }
    throw new Error("Unable to refresh access token — restarting auth");
}

export function logoutHandler(  ) {
    document.getElementById("logout-btn")?.addEventListener("click", () => {
        console.log("Logging out...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("access_token_expiry");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("verifier");
        window.location.href = redirect_uri;
    });
}