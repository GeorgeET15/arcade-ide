document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log(
      "Initializing audio handling, intro message, and right sidebar"
    );
    const musicFiles = [
      "music/1.wav",
      "music/2.mp3",
      "music/3.mp3",
      "music/4.mp3",
      "music/5.mp3",
      "music/6.mp3",
      "music/7.mp3",
      "music/8.mp3",
      "music/9.mp3",
      "music/10.mp3",
      "music/11.mp3",
    ];
    const audio = document.getElementById("bg-music");
    const headphonesBtn = document.getElementById("btn-headphones");
    const musicPopup = document.getElementById("music-popup");
    const musicPopupMessage = document.getElementById("music-popup-message");
    const outputArea = document.getElementById("output-area");
    const introMessage = document.getElementById("intro-message");
    let isPlaying = false;
    let lastClickTime = 0;
    const doubleClickDelay = 300;
    let currentSong = null;

    const popupMessages = [
      "Unleash your 8-bit genius with arcade.h! Let’s code a legend!",
      "Pixel power activated! Build epic 2D games with arcade.h!",
      "Retro beats fuel your arcade.h masterpiece! Code like a champ!",
      "Arcade.h vibes on max! Craft a 2D game that rocks the arcade!",
      "Game dev glory awaits! Power up arcade.h with retro flair!",
      "Synthwave surge! Create pixel-perfect 2D worlds with arcade.h!",
      "8-bit dreams ignited! Code your arcade.h classic now!",
      "Retro coding mode: ON! Build a 2D epic with arcade.h!",
    ];

    console.log("Audio element:", audio ? "Found" : "Not found");
    console.log("Headphones button:", headphonesBtn ? "Found" : "Not found");
    console.log("Music popup:", musicPopup ? "Found" : "Not found");
    console.log(
      "Music popup message:",
      musicPopupMessage ? "Found" : "Not found"
    );
    console.log("Output area:", outputArea ? "Found" : "Not found");
    console.log("Intro message:", introMessage ? "Found" : "Not found");

    if (introMessage) {
      const computedStyle = window.getComputedStyle(introMessage);
      console.log("Intro message computed display:", computedStyle.display);
      if (computedStyle.display === "none") {
        console.warn(
          "Intro message is hidden; check style.css for .intro-message or #intro-message"
        );
        if (outputArea) {
          outputArea.textContent =
            "Warning: Intro message is hidden. Check CSS.";
        }
      }
    } else {
      console.error("Intro message element not found in DOM");
      if (outputArea) outputArea.textContent = "Error: Intro message not found";
    }

    if (!headphonesBtn) {
      console.error(
        "Cannot attach event listener: Headphones button not found"
      );
      if (outputArea) outputArea.textContent = "Error: Audio setup failed";
      return;
    }

    headphonesBtn.addEventListener("click", async (event) => {
      const currentTime = new Date().getTime();
      const timeSinceLastClick = currentTime - lastClickTime;

      if (timeSinceLastClick < doubleClickDelay) {
        console.log("Double-click detected, playing new song");
        await playRandomSong(true);
      } else {
        console.log("Single click detected");
        if (isPlaying) {
          audio.pause();
          isPlaying = false;
          console.log("Audio paused");
        } else {
          if (!audio.src || !currentSong) {
            console.log("No audio source, playing new song");
            await playRandomSong();
          } else {
            try {
              await audio.play();
              isPlaying = true;
              console.log("Resumed playback");
            } catch (error) {
              console.error("Playback resume failed:", error.message);
              if (outputArea) {
                outputArea.textContent = `Failed to resume audio: ${error.message}`;
              }
            }
          }
        }
      }
      lastClickTime = currentTime;
    });
    console.log("Click event listener attached to headphones button");

    audio.addEventListener("play", async () => {
      if (audio.src) {
        console.log(`Saving last played song: ${audio.src}`);
        await window.electronAPI.setSettings("lastSong", audio.src);
      }
    });

    async function loadLastSong() {
      const lastSong = await window.electronAPI.getSettings("lastSong", null);
      if (lastSong && musicFiles.includes(lastSong)) {
        console.log(`Loading last played song: ${lastSong}`);
        audio.src = lastSong;
        currentSong = lastSong;
        try {
          await audio.play();
          isPlaying = true;
        } catch (error) {
          console.error(`Failed to play last song: ${error.message}`);
        }
      }
    }

    async function verifyMusicFiles() {
      console.log("Verifying music files...");
      const validFiles = [];
      for (const file of musicFiles) {
        try {
          console.log(`Fetching: ${file}`);
          const response = await fetch(file);
          if (response.ok) {
            validFiles.push(file);
            console.log(`Found music file: ${file}`);
          } else {
            console.warn(`Fetch failed for ${file}: ${response.status}`);
          }
        } catch (e) {
          console.warn(`Error fetching ${file}:`, e.message);
        }
      }
      if (validFiles.length === 0) {
        console.error("No valid music files found");
        if (outputArea) {
          outputArea.textContent =
            "Error: No music files found in music/ directory";
        }
      } else {
        console.log(`Found ${validFiles.length} valid music files`);
      }
      return validFiles;
    }

    function showMusicPopup() {
      if (musicPopup && musicPopupMessage) {
        console.log("Showing music popup");
        const randomMessage =
          popupMessages[Math.floor(Math.random() * popupMessages.length)];
        musicPopupMessage.textContent = randomMessage;
        musicPopup.style.display = "block";
        musicPopup.style.opacity = "1";
        setTimeout(() => {
          musicPopup.style.opacity = "0";
          setTimeout(() => {
            musicPopup.style.display = "none";
            console.log("Music popup hidden");
          }, 500);
        }, 1500);
      } else {
        console.error("Music popup or message element not found");
      }
    }

    async function playRandomSong(forceNew = false) {
      console.log("Attempting to play random song");
      const validFiles = await verifyMusicFiles();
      if (validFiles.length === 0) {
        console.error("No valid files to play");
        if (outputArea)
          outputArea.textContent = "Error: No valid music files available";
        return;
      }
      let selectedFile;
      if (forceNew && validFiles.length > 1) {
        const availableFiles = validFiles.filter(
          (file) => file !== currentSong
        );
        selectedFile =
          availableFiles[Math.floor(Math.random() * availableFiles.length)];
      } else {
        selectedFile =
          validFiles[Math.floor(Math.random() * validFiles.length)];
      }
      console.log(`Selected file: ${selectedFile}`);
      if (audio) {
        audio.src = selectedFile;
        currentSong = selectedFile;
        try {
          await audio.play();
          console.log("Playback started");
          isPlaying = true;
          showMusicPopup();
        } catch (error) {
          console.error("Playback failed:", error.message);
          isPlaying = false;
          if (outputArea) {
            outputArea.textContent = `Failed to play audio: ${error.message}`;
          }
        }
      } else {
        console.error("Audio element not available for playback");
        if (outputArea)
          outputArea.textContent = "Error: Audio element not found";
      }
    }

    loadLastSong();

    if (audio) {
      audio.addEventListener("error", () => {
        console.error("Audio error:", audio.error?.code, audio.error?.message);
        if (outputArea) {
          outputArea.textContent = `Audio error: ${
            audio.error?.message || "Unknown error"
          }`;
        }
      });
    } else {
      console.error("Cannot attach error listener: Audio element not found");
    }

    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(
        "CSP violation:",
        e.violatedDirective,
        e.blockedURI,
        e.originalPolicy
      );
      if (outputArea) {
        outputArea.textContent = `CSP violation: ${e.violatedDirective} blocked ${e.blockedURI}`;
      }
    });
  } catch (error) {
    console.error("Error in audio handling setup:", error);
    if (outputArea) outputArea.textContent = `Error: ${error.message}`;
  }
});
