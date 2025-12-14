const music = document.getElementById("bg-music");
const btn = document.getElementById("music-btn");

let isPlaying = false;

btn.onclick = () => {
  if (isPlaying) {
    music.pause();
  } else {
    music.play();
  }
  isPlaying = !isPlaying;
};
