const NACHOS_PLAYER_URL = "https://nach-il.com/player/"

const getVolume = async () => {
    return (await chrome.cookies.get({ url: NACHOS_PLAYER_URL, name: "nachos_volume" })) ?? 50;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log(tab?.url?.startsWith(NACHOS_PLAYER_URL))
    if (changeInfo.status == "complete" && tab && tab.url?.startsWith(NACHOS_PLAYER_URL)) {
        console.log("Injecting plyr css")
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["./lib/plyr.css"]
        });
        
        console.log("Injecting plyr")
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["./lib/plyr.polyfilled.js"]
        })

        console.log("Injecting main script")
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content-script.js"]
        });
    }
});