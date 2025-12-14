:root{
  --bg:#000;
  --white:#fff;
}

html, body{
  height: 100%;
}

body{
  margin:0;
  background: var(--bg);
  color: var(--white);
  overflow: hidden;
  font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
}

.cover{
  position: relative;
  height: 100vh;
  background: var(--bg);
  overflow: hidden;
}

#hero-canvas{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  display:block;
}

/* Nút nhạc */
#music-btn{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 10;
  font-size: 22px;
  border: 0;
  background: rgba(255,255,255,0.10);
  color: #fff;
  border-radius: 999px;
  padding: 10px 12px;
  cursor: pointer;
  backdrop-filter: blur(6px);
}

#music-btn:active{
  transform: scale(0.98);
}
