/* ============================================================
   King-Arthur-3a · APP 横屏外壳脚本
   职责：竖屏守卫 / 全屏并锁横屏 / 手势抑制 / 渲染分辨率自动降档
   不触碰游戏内部的玩法代码，只在其外层做设备适配。
   ============================================================ */
(function () {
  'use strict';

  var d = document.documentElement;
  var coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
  var touchable = coarse && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  var mobileUA = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MicroMessenger/i.test(navigator.userAgent || '');
  var standalone = false;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}

  if (touchable) d.classList.add('is-touch');
  if (mobileUA || standalone) d.classList.add('is-app');

  var guard = document.getElementById('rot-guard');
  var tip = document.getElementById('rg-tip');
  var forced = /[?&]guard=1/.test(location.search);
  var eligible = touchable || mobileUA || forced;
  var armed = false;

  function viewport() {
    var vv = window.visualViewport;
    return {
      w: (vv && vv.width) || window.innerWidth || d.clientWidth || 0,
      h: (vv && vv.height) || window.innerHeight || d.clientHeight || 0
    };
  }

  function isPortrait() {
    var v = viewport();
    return v.h > v.w * 1.03;
  }

  function pauseIfPlaying() {
    var g = window.__G && window.__G.game;
    if (!g) return;
    try { if (g.state === 'playing') g.pause(); } catch (e) {}
  }

  function syncGuard() {
    if (!guard) return;
    if (!eligible) { guard.classList.remove('on'); guard.setAttribute('aria-hidden', 'true'); return; }
    var show = forced || isPortrait();
    if (show) pauseIfPlaying();
    guard.classList.toggle('on', show);
    guard.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  /* ---------- 全屏 + 横屏方向锁定（必须在用户手势内调用） ---------- */
  function goLandscape() {
    var el = document.getElementById('app') || d;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          var p = el.requestFullscreen({ navigationUI: 'hide' });
          if (p && p.catch) p.catch(function () {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      }
    } catch (e) {}
    try {
      var so = screen.orientation;
      if (so && typeof so.lock === 'function') {
        var q = so.lock('landscape');
        if (q && q.catch) q.catch(function () {});
      }
    } catch (e) {}
    armed = true;
    window.setTimeout(syncGuard, 120);
  }

  /* ---------- 守卫按钮：尝试转向，失败就如实提示 ---------- */
  if (guard) {
    guard.addEventListener('touchstart', function (e) {
      if (e.target && e.target.id === 'rg-go') { e.preventDefault(); }
    }, { passive: false });

    guard.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || t.id !== 'rg-go') return;
      e.preventDefault();
      e.stopPropagation();
      goLandscape();
      window.setTimeout(function () {
        if (isPortrait()) {
          if (tip) {
            tip.textContent = '当前环境不允许自动转向：请手动把手机横过来，或在 App 设置里打开横屏方向。';
            tip.classList.add('warn');
          }
          syncGuard();
        }
      }, 1500);
    }, true);
  }

  /* ---------- 首次点击开始 / 进入时，在用户手势内顺带全屏并锁横屏 ---------- */
  if (eligible) {
    document.addEventListener('click', function (e) {
      if (armed) return;
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-act]') || t.closest('#rg-go')) goLandscape();
    }, true);
  }

  /* ---------- 手势与系统默认行为抑制（缩放、长按菜单、下拉刷新） ---------- */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
    document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
  if (eligible) {
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, { passive: false });
  }

  /* ---------- 渲染分辨率自适应：先封顶，再按实测帧率逐档下调 ---------- */
  var prCap = Math.min(window.devicePixelRatio || 1, 2);
  var prReady = false;
  var lowStreak = 0;

  function applyPR() {
    var G = window.__G;
    if (!G || !G.renderer || typeof G.renderer.setPixelRatio !== 'function') return false;
    try { G.renderer.setPixelRatio(prCap); return true; } catch (e) { return false; }
  }

  function startFpsWatch() {
    window.setInterval(function () {
      var G = window.__G;
      if (!G || !G.game || G.game.state !== 'playing') { lowStreak = 0; return; }
      var s = null;
      try { s = window.__stats ? window.__stats() : null; } catch (e) {}
      var fps = s && s.fps;
      if (!fps || fps <= 0) return;
      if (fps < 42) { lowStreak += 1; } else { lowStreak = 0; }
      if (lowStreak >= 2 && prCap > 1) {
        prCap = Math.max(1, Math.round((prCap - 0.4) * 100) / 100);
        applyPR();
        lowStreak = 0;
      }
    }, 3000);
  }

  var prPoll = window.setInterval(function () {
    if (applyPR()) { prReady = true; window.clearInterval(prPoll); startFpsWatch(); }
  }, 150);

  window.addEventListener('resize', function () {
    window.setTimeout(syncGuard, 150);
    window.setTimeout(function () { if (prReady) applyPR(); }, 340);
  }, { passive: true });

  window.addEventListener('orientationchange', function () {
    window.setTimeout(syncGuard, 220);
    window.setTimeout(function () { if (prReady) applyPR(); }, 420);
  }, { passive: true });

  window.setTimeout(syncGuard, 400);
  window.setInterval(syncGuard, 2000);

  /* 联调用：?simtouch=1 触发一次合成 touchstart，让触屏控件在桌面/无头环境也能显示出来
     正式使用时不需要这个参数，真实手指触摸会自动进入触屏模式 */
  if (/[?&]simtouch=1/.test(location.search)) {
    window.setTimeout(function () {
      try { window.dispatchEvent(new Event('touchstart')); } catch (e) {}
    }, 1500);
  }

  /* 供接入方/联调检查当前状态 */
  window.__appShell = {
    isPortrait: isPortrait,
    isEligible: function () { return eligible; },
    renderScale: function () { return prCap; },
    enterLandscape: goLandscape,
    sync: syncGuard
  };
})();
