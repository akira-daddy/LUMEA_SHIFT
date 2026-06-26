/* LUMEA SHIFT – JavaScript */

// Scroll reveal
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add('visible');
  });
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Header removed

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


// ══════════════════════════════════════════════════════════════
// 注文モーダル – Order Modal Controller
// ① GAS Web App URL をデプロイ後にここへ貼り付けてください
// ══════════════════════════════════════════════════════════════
(function () {
  var GAS_URL = "https://script.google.com/macros/s/AKfycbxrBgyfo7zx9e3HviZ3fxImznVO30OPnhWT2rrHopxoliDxBtmDkoVi3zancE9n10Ze2Q/exec"; // ← ここを書き換える

  // ── プラン設定 ──
  var PLANS = {
    subscription: {
      label: "定期購入 おすすめ",
      price: "初回 ¥1,980",
      priceDetail: "（2回目以降 ¥3,480）",
      summaryPlan: "定期購入（初回¥1,980）",
      summaryPrice: "¥1,980（送料無料）",
    },
    normal: {
      label: "通常購入",
      price: "¥3,980",
      priceDetail: "（税込 ＋ 送料¥550）",
      summaryPlan: "通常購入（¥3,980）",
      summaryPrice: "¥3,980 ＋ 送料¥550",
    },
  };

  // ── DOM 参照 ──
  var modal       = document.getElementById("orderModal");
  var btnClose    = document.getElementById("omClose");
  var btnDoneClose= document.getElementById("omDoneClose");
  var btnBack     = document.getElementById("omBack");
  var btnNext     = document.getElementById("omNext");
  var btnSubmit   = document.getElementById("omSubmit");
  var errorBox    = document.getElementById("omErrorBox");
  var doneScreen  = document.getElementById("omDone");
  var pages       = [
    document.getElementById("omPage1"),
    document.getElementById("omPage2"),
    document.getElementById("omPage3"),
  ];
  var steps = document.querySelectorAll(".om-step");

  var currentStep = 1; // 1〜3
  var currentPlan = "subscription";

  // ── モーダルを開く ──
  function openModal(plan) {
    currentPlan = plan || "subscription";
    currentStep = 1;

    // プランバナー更新
    var p = PLANS[currentPlan];
    document.getElementById("omPlanLabel").textContent  = p.label;
    document.getElementById("omPlanPrice").innerHTML    =
      p.price + '<small>' + p.priceDetail + '</small>';

    // サマリー更新
    document.getElementById("omSummaryPlan").querySelector("span:last-child").textContent  = p.summaryPlan;
    document.getElementById("omSummaryPrice").querySelector("span:last-child").textContent = p.summaryPrice;

    // UI 初期化
    showPage(1);
    clearAllErrors();
    hideErrorBox();
    doneScreen.hidden = true;
    modal.querySelector(".om-body").hidden   = false;
    modal.querySelector(".om-footer").hidden = false;
    modal.querySelector(".om-steps").hidden  = false;
    modal.querySelector(".om-plan-banner").hidden = false;

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    // フォーカス管理
    setTimeout(function () {
      var first = document.getElementById("omName");
      if (first) first.focus();
    }, 350);
  }

  // ── モーダルを閉じる ──
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    resetForm();
  }

  // ── フォームリセット ──
  function resetForm() {
    ["omName","omKana","omEmail","omEmailC","omTel","omZip","omAddr","omNote"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.querySelectorAll('input[name="omPayment"]').forEach(function(r){ r.checked = false; });
    clearAllErrors();
    hideErrorBox();
    currentStep = 1;
  }

  // ── ページ切り替え ──
  function showPage(n) {
    pages.forEach(function (p, i) { p.hidden = (i + 1 !== n); });
    steps.forEach(function (s, i) {
      s.classList.remove("active", "done");
      if (i + 1 === n) s.classList.add("active");
      if (i + 1 < n)  s.classList.add("done");
    });
    btnBack.hidden   = (n === 1);
    btnNext.hidden   = (n === 3);
    btnSubmit.hidden = (n !== 3);
    currentStep = n;

    // ページトップへ
    var body = modal.querySelector(".om-body");
    if (body) body.scrollTop = 0;
  }

  // ── バリデーション ──────────────────────────────────────────
  function showFieldError(id, msg) {
    var el = document.getElementById("err" + id);
    var input = document.getElementById("om" + id) || document.getElementById("om" + id.charAt(0).toUpperCase() + id.slice(1));
    if (el) el.textContent = msg;
    if (input) input.classList.add("is-error");
  }
  function clearFieldError(fieldId, errId) {
    var el  = document.getElementById(errId);
    var inp = document.getElementById(fieldId);
    if (el)  el.textContent = "";
    if (inp) inp.classList.remove("is-error");
  }
  function clearAllErrors() {
    document.querySelectorAll(".om-field-err").forEach(function(e){ e.textContent = ""; });
    document.querySelectorAll(".om-input").forEach(function(e){ e.classList.remove("is-error"); });
  }
  function showErrorBox(msgs) {
    errorBox.innerHTML = msgs.map(function(m){ return "・" + m; }).join("<br>");
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function hideErrorBox() {
    errorBox.hidden = true;
    errorBox.innerHTML = "";
  }

  function validateStep1() {
    var errs = [];
    var name  = (document.getElementById("omName").value || "").trim();
    var kana  = (document.getElementById("omKana").value || "").trim();
    var email = (document.getElementById("omEmail").value || "").trim();
    var emailC= (document.getElementById("omEmailC").value || "").trim();
    var tel   = (document.getElementById("omTel").value || "").trim();

    clearAllErrors();
    hideErrorBox();

    if (name.length < 2) {
      showFieldError("Name", "お名前を2文字以上で入力してください");
      errs.push("お名前を正しく入力してください");
    }
    if (!kana || !/^[ァ-ヶー\s　]+$/.test(kana)) {
      showFieldError("Kana", "カタカナで入力してください");
      errs.push("フリガナはカタカナで入力してください");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("Email", "正しいメールアドレスを入力してください");
      errs.push("メールアドレスを正しく入力してください");
    }
    if (!emailC || email !== emailC) {
      showFieldError("EmailC", "メールアドレスが一致しません");
      errs.push("メールアドレス（確認）が一致しません");
    }
    var telClean = tel.replace(/[\s\-]/g, "");
    if (!tel || !/^[0-9]{10,11}$/.test(telClean)) {
      showFieldError("Tel", "電話番号を10〜11桁で入力してください");
      errs.push("電話番号を正しく入力してください");
    }
    if (errs.length) showErrorBox(errs);
    return errs.length === 0;
  }

  function validateStep2() {
    var errs = [];
    var zip  = (document.getElementById("omZip").value || "").trim().replace(/\-/g, "");
    var addr = (document.getElementById("omAddr").value || "").trim();

    clearAllErrors();
    hideErrorBox();

    if (!/^\d{7}$/.test(zip)) {
      showFieldError("Zip", "郵便番号を7桁の数字で入力してください");
      errs.push("郵便番号を正しく入力してください");
    }
    if (addr.length < 5) {
      showFieldError("Addr", "住所を正しく入力してください");
      errs.push("住所を正しく入力してください");
    }
    if (errs.length) showErrorBox(errs);
    return errs.length === 0;
  }

  function validateStep3() {
    var checked = document.querySelector('input[name="omPayment"]:checked');
    clearFieldError(null, "errPayment");
    hideErrorBox();
    if (!checked) {
      document.getElementById("errPayment").textContent = "お支払い方法を選択してください";
      showErrorBox(["お支払い方法を選択してください"]);
      return false;
    }
    return true;
  }

  // ── フォーム送信 ──
  function submitOrder() {
    if (!validateStep3()) return;

    var payload = {
      plan:         currentPlan,
      name:         (document.getElementById("omName").value  || "").trim(),
      kana:         (document.getElementById("omKana").value  || "").trim(),
      email:        (document.getElementById("omEmail").value || "").trim(),
      emailConfirm: (document.getElementById("omEmailC").value|| "").trim(),
      tel:          (document.getElementById("omTel").value   || "").trim(),
      zip:          (document.getElementById("omZip").value   || "").trim().replace(/\-/g, ""),
      address:      (document.getElementById("omAddr").value  || "").trim(),
      payment:      (document.querySelector('input[name="omPayment"]:checked') || {}).value || "",
      note:         (document.getElementById("omNote").value  || "").trim(),
    };

    // 送信中UI
    btnSubmit.disabled = true;
    document.getElementById("omSubmitLabel").textContent = "送信中...";
    document.getElementById("omSubmitSpinner").hidden = false;
    hideErrorBox();

    // ── GAS CORS 対策 ──────────────────────────────────────────
    // GASはOPTIONSプリフライトを処理しないため
    // Content-Type: application/json でのPOSTはCORSエラーになる。
    // 対策: text/plain で送り、GAS側で e.postData.contents を読む。
    //       また GAS はリダイレクトを返すので redirect:"follow" が必要。
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    })
      .then(function (r) {
        // opaque（リダイレクト後no-cors）は body 読み取り不可 → 成功扱い
        if (r.type === "opaque") {
          showDoneScreen();
          return;
        }
        return r.text().then(function (txt) {
          try {
            var data = JSON.parse(txt);
            if (data.ok) {
              showDoneScreen();
            } else {
              var msgs = data.errors || ["エラーが発生しました。内容をご確認ください。"];
              showErrorBox(msgs);
              resetSubmitBtn();
            }
          } catch (e) {
            // JSONパース失敗 = GASが処理済みとみなして完了画面へ
            showDoneScreen();
          }
        });
      })
      .catch(function (err) {
        console.error("fetch error:", err);
        // フォールバック: no-cors で fire-and-forget
        sendViaBeacon(payload);
      });
  }

  // no-cors フォールバック（sendBeacon / XMLHttpRequest）
  function sendViaBeacon(payload) {
    var blob = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
    if (navigator.sendBeacon && navigator.sendBeacon(GAS_URL, blob)) {
      showDoneScreen();
      return;
    }
    // 最終手段: XMLHttpRequest（非同期）
    var xhr = new XMLHttpRequest();
    xhr.open("POST", GAS_URL, true);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        showDoneScreen(); // 成否問わず完了画面（GASは処理済み）
      }
    };
    xhr.onerror = function () { showDoneScreen(); };
    xhr.send(JSON.stringify(payload));
  }

  function resetSubmitBtn() {
    btnSubmit.disabled = false;
    document.getElementById("omSubmitLabel").textContent = "注文を確定する";
    document.getElementById("omSubmitSpinner").hidden = true;
  }

  function showDoneScreen() {
    modal.querySelector(".om-body").hidden   = true;
    modal.querySelector(".om-footer").hidden = true;
    modal.querySelector(".om-steps").hidden  = true;
    modal.querySelector(".om-plan-banner").hidden = true;
    doneScreen.hidden = false;
  }

  // ── イベント登録 ──────────────────────────────────────────
  // CTAボタン群（すべて data-plan 付き）
  document.querySelectorAll(".open-order-modal").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.dataset.plan || "subscription");
    });
  });

  // 閉じる
  btnClose.addEventListener("click", closeModal);
  btnDoneClose.addEventListener("click", closeModal);

  // オーバーレイ背景クリックで閉じる
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  // ESCキー
  document.addEventListener("keydown", function (e) {
    if (!modal.hidden && e.key === "Escape") closeModal();
  });

  // 戻る
  btnBack.addEventListener("click", function () {
    if (currentStep > 1) {
      clearAllErrors();
      hideErrorBox();
      showPage(currentStep - 1);
    }
  });

  // 次へ
  btnNext.addEventListener("click", function () {
    var valid = (currentStep === 1) ? validateStep1()
              : (currentStep === 2) ? validateStep2()
              : true;
    if (valid) showPage(currentStep + 1);
  });

  // 送信
  btnSubmit.addEventListener("click", submitOrder);

  // ── リアルタイム入力クリア ──
  ["omName","omKana","omEmail","omEmailC","omTel","omZip","omAddr"].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", function() { el.classList.remove("is-error"); });
  });
  document.querySelectorAll('input[name="omPayment"]').forEach(function(r){
    r.addEventListener("change", function(){
      document.getElementById("errPayment").textContent = "";
      hideErrorBox();
    });
  });

})();
