chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "textToSpeech",
        title: "Send text to TTS",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "textToSpeech") {
        const selectedText = info.selectionText;
        try {
            await new Promise(resolve => chrome.runtime.sendMessage({ action: "audioNotReady" }, resolve));
            handleTextToSpeech(selectedText);
            const selectionPosition = await getSelectionPosition(tab.id);
            if (selectionPosition) {
                createPopupWindow(selectionPosition);
            } else {
                console.error('Error:', 'Could not get selection position');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

async function handleTextToSpeech(selectedText) {
    try {
        const response = await fetch("http://127.0.0.1:8000/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: selectedText })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const base64data = await blobToBase64(blob);

        await new Promise(resolve =>
            chrome.storage.local.set({ ttsAudio: base64data }, resolve)
        );

        chrome.runtime.sendMessage({ action: "audioReady" });
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function getSelectionPosition(tabId) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const windowPosX = window.screenX;
                    const windowPosY = window.screenY;
                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;
                    return {
                        selection_x: rect.left, selection_y: rect.top,
                        window_x: windowPosX, window_y: windowPosY,
                        screen_width: screenWidth, screen_height: screenHeight,
                    };
                }
                return null;
            }
        }, (results) => {
            if (results && results[0] && results[0].result) {
                resolve(results[0].result);
            } else {
                reject('Could not get selection position');
            }
        });
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function createPopupWindow(position) {
    const { selection_x, selection_y, window_x, window_y } = position;
    const popupWidth = 300;
    const popupHeight = 75;

    chrome.windows.create({
        url: "popup.html",
        type: "popup",
        width: popupWidth,
        height: popupHeight,
        left: Math.floor(window_x + selection_x),
        top: Math.floor(window_y + selection_y)
    });
}
