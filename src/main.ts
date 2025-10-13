import { redirectToAuthCodeFlow, getAccessToken, logoutHandler, refreshAccessToken, getValidAccessToken } from "./auth";
import { setupSpotifyPlayer } from "./player";
import { fetchProfile } from "./spotifyApi";

const clientId = "33c276b6719a4a64b6cc3d0cb518e727";
let appStarted = false;

const welcomeScreen = document.getElementById("welcome-screen")!;
const app = document.getElementById("app")!;
const startBtn = document.getElementById("start-btn")!;

startBtn.addEventListener("click", () => {
    appStarted = true;
    welcomeScreen.style.display = "none";
    redirectToAuthCodeFlow(clientId);
});

(async () => {
    let token = localStorage.getItem("access_token");
    const code = new URLSearchParams(window.location.search).get("code");

    if (!token && !code) {
        console.log("🕒 Waiting for user to click Start...");
        welcomeScreen.style.display = "block";
        app.style.display = "none";
        return;
    }

    appStarted = true;

    try {
        if (code && !token) {
            // First-time authorization
            token = await getAccessToken(clientId, code);
        }

        // Validate or refresh existing token
        token = await getValidAccessToken(clientId, appStarted);
    } catch (err) {
        console.warn("⚠️ Token invalid or refresh failed — redirecting...");
        redirectToAuthCodeFlow(clientId);
        return;
    }

    const profile = await fetchProfile(token);

    populateUI(profile);
    setupSpotifyPlayer(clientId, appStarted);

    setInterval(async () => {
        const newToken = await refreshAccessToken(clientId);
        if (newToken) {
            console.log("Token refreshed automatically");
            if ((window as any).player) {
                (window as any).player.connect();
                (window as any).player.activateElement();
            }
        }
    }, 50 * 60 * 1000);
})();

function populateUI(profile: UserProfile | undefined) {
    //TODO show loader on UI
    if (!profile) {
        console.warn("No profile data — cannot populate UI.");
        return;
    } else {
        console.log("Populating UI... with profile", profile);
    }

    welcomeScreen.style.display = "none";
    app.style.display = "block";
    
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images && profile.images.length > 0) {
        const profileImage = new Image(30, 30);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("uri")!.setAttribute("target", "blank");

    logoutHandler();
}
