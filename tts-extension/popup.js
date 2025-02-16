let audio;

function getStorageData(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => resolve(result[key]));
    });
};

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "audioReady") {
        document.getElementById("playBtn").disabled = false;
    } else if (message.action === "audioNotReady") {
        document.getElementById("playBtn").disabled = true;
    }
});

document.getElementById("playBtn").addEventListener("click", async () => {
    const speed = document.getElementById("speed").value;
    try {
        const ttsAudio = await getStorageData("ttsAudio");
        if (ttsAudio) {
            if (audio) {
                audio.pause();
            }
            audio = new Audio(ttsAudio);
            audio.playbackRate = speed;
            audio.play();
        }
    } catch (error) {
        console.error('Error playing audio:', error);
    }
});

document.getElementById("speed").addEventListener("input", () => {
    const speed = document.getElementById("speed").value;
    if (audio) {
        audio.playbackRate = speed;
    }
});
