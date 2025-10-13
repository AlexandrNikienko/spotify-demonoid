export async function fetchProfile(token: string): Promise<UserProfile | undefined> {
    //TODO show loader  - loading profile
    console.log("Fetching profile...");
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        console.warn("Failed to fetch profile", await result.text());
        return;
    }

    return await result.json();
}

export async function fetchUserPlaylists(token: string): Promise<SimplePlaylist | undefined> {
    //TODO show loader  - loading playlists
    const result = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        console.error("Failed to fetch playlists", await result.text());
        return;
    }

    return await result.json();
}

export async function fetchPlaylistTracks(playlistId: string, token: string): Promise<string[]> {
    //TODO show loader  - loading playlist tracks
    let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
    const tracks: string[] = [];
    while (url) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to fetch playlist tracks");
        const data = await res.json();
        tracks.push(...data?.items?.map((i: any) => i.track.uri));
        url = data.next;
    }
    return tracks;
}

export async function playTrackAtPosition(trackUri: string, positionMs: number, token: string ,currentDeviceId: string): Promise<void> {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ uris: [trackUri], position_ms: positionMs })
    });
}
