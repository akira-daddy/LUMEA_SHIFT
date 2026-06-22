/* LUMEA SHIFT – JavaScript */

// Scroll reveal
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add('visible');
  });
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Header scroll
const header = document.getElementById('siteHeader');
window.addEventListener('scroll',()=>{
  if(window.scrollY>10) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// Sticky CTA
const stickyCta = document.getElementById('stickyCta');
const heroSection = document.querySelector('.hero');
const finalSection = document.querySelector('.section-final');
const stickyObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.target===heroSection && !e.isIntersecting){
      stickyCta.classList.add('visible');
    } else if(e.target===heroSection && e.isIntersecting){
      stickyCta.classList.remove('visible');
    }
    if(e.target===finalSection && e.isIntersecting){
      stickyCta.classList.remove('visible');
    } else if(e.target===finalSection && !e.isIntersecting){
      if(!heroSection.getBoundingClientRect().bottom < 0){
        stickyCta.classList.add('visible');
      }
    }
  });
},{threshold:0.1});
stickyObserver.observe(heroSection);
stickyObserver.observe(finalSection);

// FAQ toggle
function toggleFAQ(el){
  const item = el.closest('.faq-item');
  item.classList.toggle('open');
}

// Review dots
const scroll = document.getElementById('reviewsScroll');
const dots = document.querySelectorAll('#reviewDots .dot');
if(scroll){
  scroll.addEventListener('scroll',()=>{
    const idx = Math.round(scroll.scrollLeft / 276);
    dots.forEach((d,i)=>d.classList.toggle('active',i===idx));
  });
}

// Story scenes – 連続再生ロジック
(function(){
  const scenes = Array.from(document.querySelectorAll('.story-scene'));
  if(!scenes.length) return;

  let currentIdx = -1;
  let isRunning = false;

  // 全シーンのvideoからloopを確実に除去
  scenes.forEach(s=>{
    const v = s.querySelector('video');
    if(v) v.removeAttribute('loop');
  });

  // ブラウザの音声ロック解除：ページ初回インタラクション時に無音再生→即停止
  let audioUnlocked = false;
  function unlockAudio(){
    if(audioUnlocked) return;
    audioUnlocked = true;
    scenes.forEach(s=>{
      const v = s.querySelector('video');
      if(!v) return;
      v.muted = false;
      v.play().then(()=>{ v.pause(); v.currentTime = 0; }).catch(()=>{});
    });
  }
  // マウス移動・タッチ・クリックのいずれかで一度だけ解除
  ['mousemove','touchstart','click'].forEach(ev=>{
    document.addEventListener(ev, unlockAudio, {once:true, passive:true});
  });

  function stopAll(){
    scenes.forEach(s=>{
      const v = s.querySelector('video');
      if(!v) return;
      v.pause();
      v.currentTime = 0;
      s.classList.remove('playing');
    });
  }

  // ── ユーザーによる「故意のスクロール」検知 ──
  // playScene() 内で scrollIntoView を呼ぶ際は programmaticScroll を立てて、
  // それによって発火する scroll イベントを「ユーザー操作」と誤認しないようにする。
  let programmaticScroll = false;
  let programmaticScrollTimer = null;

  function markProgrammaticScroll(){
    programmaticScroll = true;
    clearTimeout(programmaticScrollTimer);
    // smooth scrollの完了を待つための猶予期間
    programmaticScrollTimer = setTimeout(()=>{
      programmaticScroll = false;
    }, 900);
  }

  function onUserScroll(){
    if(programmaticScroll) return; // 自動スクロール中は無視
    if(isRunning){
      stopSequence();
    }
  }

  // scroll / wheel / touchmove のいずれかでユーザーの能動的な画面移動を検知
  window.addEventListener('scroll', onUserScroll, {passive:true});
  window.addEventListener('wheel', onUserScroll, {passive:true});
  window.addEventListener('touchmove', onUserScroll, {passive:true});

  function playScene(idx){
    if(idx >= scenes.length){
      isRunning = false;
      return;
    }
    currentIdx = idx;
    const scene = scenes[idx];
    const video = scene.querySelector('video');
    if(!video) return;

    scenes.forEach((s,i)=>{
      if(i !== idx){
        const v = s.querySelector('video');
        if(v){ v.pause(); v.currentTime = 0; }
        s.classList.remove('playing');
      }
    });

    // そのSceneの画面までスクロール（自動スクロールであることをマーク）
    markProgrammaticScroll();
    scene.scrollIntoView({behavior:'smooth', block:'start'});

    video.currentTime = 0;
    video.muted = false;
    const p = video.play();
    scene.classList.add('playing');

    if(p && p.catch){
      p.catch(()=>{
        video.muted = true;
        video.play().catch(()=>{});
        scene.classList.add('playing');
      });
    }

    video.addEventListener('ended', function(){
      scene.classList.remove('playing');
      if(isRunning) playScene(currentIdx + 1);
    },{once:true});
  }

  function startSequence(){
    isRunning = true;
    playScene(0);
  }

  function stopSequence(){
    isRunning = false;
    stopAll();
    currentIdx = -1;
  }

  // ビューポートに入ったら連続再生を自動開始（scene1が50%見えたとき）
  const scene1 = scenes[0];
  const seqObserver = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && !isRunning) startSequence();
    });
  }, { threshold: 0.5 });
  seqObserver.observe(scene1);

  scene1.addEventListener('mouseenter', ()=>{
    if(!isRunning) startSequence();
  });

  scene1.addEventListener('click', ()=>{
    if(!isRunning){
      startSequence();
    } else {
      const v = scene1.querySelector('video');
      const isCurrent = currentIdx === 0;
      if(isCurrent && v && !v.paused){
        stopSequence();
      } else {
        stopSequence();
        setTimeout(startSequence, 50);
      }
    }
  });

  scenes.slice(1).forEach((scene)=>{
    scene.addEventListener('click', ()=>{
      const video = scene.querySelector('video');
      if(!video) return;
      if(video.paused){
        video.muted = false;
        video.play().catch(()=>{ video.muted = true; video.play(); });
        scene.classList.add('playing');
      } else {
        video.pause();
        scene.classList.remove('playing');
      }
    });
  });
})();

// ── Hero promo video: autoplay on viewport enter, hover/tap to toggle ──
(function(){
  const wrap  = document.getElementById('heroVideoWrap');
  const video = document.getElementById('heroPromoVideo');
  if(!wrap || !video) return;

  video.loop  = true;
  video.muted = true;

  function playHero(){
    const p = video.play();
    if(p && p.catch) p.catch(()=>{});
    wrap.classList.add('playing');
  }
  function pauseHero(){
    video.pause();
    wrap.classList.remove('playing');
  }

  // ビューポートに入ったら自動再生
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ playHero(); }
    });
  }, { threshold: 0.3 });
  observer.observe(wrap);

  // Desktop: mouseenter でも再生
  wrap.addEventListener('mouseenter', ()=>{
    if(video.paused) playHero();
  });

  // tap/click で再生トグル
  let isTouching = false;
  wrap.addEventListener('touchstart', ()=>{ isTouching = true; }, {passive:true});
  wrap.addEventListener('touchend', ()=>{
    if(video.paused){ playHero(); } else { pauseHero(); }
    setTimeout(()=>{ isTouching = false; }, 400);
  }, {passive:true});
  wrap.addEventListener('click', ()=>{
    if(isTouching) return;
    if(video.paused){ playHero(); } else { pauseHero(); }
  });
})();
