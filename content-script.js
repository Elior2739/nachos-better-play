const getStartTime = () => {
    const scripts = document.querySelectorAll('script');
    let startTime = 0;
    scripts.forEach(script => {
        if (script.innerText.includes('lastWatchedTime')) {
            const match = script.innerText.match(/lastWatchedTime\s*[:=]\s*(\d+)/);
            if (match) startTime = parseFloat(match[1]);
        }
    });
    return startTime;
}

const getVideoId = () => window.location.href.split("/")[5];

let lastTime = 0;
const sendProgressToServer = (player) => {
    if (!player || lastTime == player.currentTime) return;
    lastTime = player.currentTime;

    const payload = JSON.stringify({
        currentTime: Math.floor(player.currentTime),
        duration: Math.floor(player.duration),
        videoId: getVideoId(),
        videoType: 'serie'
    });

    fetch('/track-video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
    }).catch(() => console.log("Failed to update progress"));
}

const getVideoURL = () => {
    const videoPlayer = document.getElementById("my-video_html5_api");
    return videoPlayer ? (videoPlayer.children[0]?.src ?? videoPlayer.src) : undefined;
}

const getNextURL = () => {
    const nextEl = document.querySelector(".for-desktop");
    return nextEl ? nextEl.parentNode.href : undefined;
}

const getBackURL = () => {
    const backEl = document.querySelector(".back-button");
    return backEl ? backEl.href : undefined;
}

const createVideoElement = (url) => {
    const ele = document.createElement('video');
    ele.id = 'player';
    ele.className = 'plyr';
    ele.src = url;
    ele.controls = true;
    ele.style.maxHeight = "100vh";
    ele.style.width = "100%";
    ele.playsinline = true;
    return ele;
}

const createBackButtonElement = () => {
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'plyr__control';
    backBtn.id = 'plyr-prev-episode';
    backBtn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;transform: rotate(180deg);">
            <path fill="currentColor" d="M6,18L14.5,12L6,6V18M16,6V18H18V6H16Z" />
        </svg>
        <span class="plyr__tooltip">חזרה</span>`;
    return backBtn;
}

const createNextButtonElement = () => {
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'plyr__control plyr__control--next-episode';
    nextBtn.id = 'plyr-next-episode';
    nextBtn.setAttribute('data-plyr', 'next-episode');

    nextBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6,18L14.5,12L6,6V18M16,6V18H18V6H16Z"></path>
        </svg>
        <span class="plyr__tooltip" role="tooltip">הפרק הבא</span>
    `;

    return nextBtn;
}
const removeOldElements = () => {
    const oldVideo = document.querySelector("#my-video_html5_api");
    if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = "";
        oldVideo.load();
        oldVideo.remove();
    }
    const container = document.querySelector(".flix_app_player");
    if (container) container.remove();
};

const createFloatingNextButton = (url) => {
    const btn = document.createElement('div');
    btn.id = 'floating-next-episode';
    btn.innerHTML = `
        <div style="
            position: absolute; bottom: 80px; right: 20px; z-index: 10;
            background: rgba(0, 0, 0, 0.8); color: white; padding: 15px 25px;
            border-radius: 4px; cursor: pointer; font-family: sans-serif;
            border: 1px solid #fff; transition: 0.3s;
        ">
            <span style="font-weight: bold;">הפרק הבא מתחיל בקרוב...</span>
            <div style="margin-top: 5px; font-size: 0.9em; color: #00b3ff;">עבור עכשיו >></div>
        </div>
    `;
    btn.onclick = () => window.location.href = url;
    return btn;
};

(function () {
    const SourceURL = getVideoURL();
    const NextURL = getNextURL();
    const BackURL = getBackURL() ?? "https://nach-il.com/";

    if (typeof Plyr === 'undefined' || !SourceURL) return console.log("Couldn't find the source or Plyr");

    const newVideoElement = createVideoElement(SourceURL);
    removeOldElements();
    document.body.appendChild(newVideoElement);

    const player = new Plyr(newVideoElement, {
        autoplay: true,
        keyboard: { global: false }
    });

    player.once("ready", () => {
        const controls = document.querySelector('.plyr__controls');
        if (controls) {
            const playBtn = controls.querySelector('[data-plyr="play"]');

            if (BackURL) {
                const backBtn = createBackButtonElement();
                backBtn.onclick = () => window.location.href = BackURL;
                playBtn.before(backBtn);
            }

            if (NextURL) {
                const nextBtn = createNextButtonElement();
                nextBtn.onclick = () => window.location.href = NextURL;
                playBtn.after(nextBtn);
            }
        }

        setInterval(() => sendProgressToServer(player), 15000);
    });

    let jumped = false;
    player.on("play", () => {
        if (!jumped) player.currentTime = getStartTime();
        jumped = true;
    });

    player.on("pause", () => sendProgressToServer(player));
    player.once("ended", () => {
        if(NextURL != undefined) {
            window.location.href = NextURL;
        }
    })

    let nextBtnAdded = false;
    player.on("timeupdate", () => {
        if (player.duration - player.currentTime <= 30 && NextURL && !nextBtnAdded && NextURL != undefined) {
            const floatingBtn = createFloatingNextButton(NextURL);
            player.elements.container.appendChild(floatingBtn);
            nextBtnAdded = true;
        }

        if (player.duration - player.currentTime > 30 && nextBtnAdded) {
            const existingBtn = document.getElementById('floating-next-episode');
            if (existingBtn) existingBtn.remove();
            nextBtnAdded = false;
        }
    });

    window.addEventListener("keydown", (event) => {
        const handledKeys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Space"];
        if (handledKeys.includes(event.code)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            switch (event.code) {
                case "ArrowDown": player.decreaseVolume(0.1); break;
                case "ArrowUp": player.increaseVolume(0.1); break;
                case "ArrowLeft": player.rewind(5); break;
                case "ArrowRight": player.forward(5); break;
                case "Space": player.togglePlay(); break;
            }
        }
    }, true);

    window.addEventListener('beforeunload', () => sendProgressToServer(player));
    window.addEventListener('pagehide', () => sendProgressToServer(player));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') sendProgressToServer(player);
    });
})();

console.log("Content-Script injected")