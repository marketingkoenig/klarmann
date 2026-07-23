/* Design-Tokens liegen in tailwind.config.js — CSS-Build: npm run css */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const hasLenis = typeof Lenis !== 'undefined';

  /* ---------- Bild-Fallbacks: gebürstetes Edelstahl-Panel, monochrom ---------- */
  function steelSvg(label, dark) {
    const c = dark
      ? ['#26333E', '#141F28', '#31404C', '#0D151C']
      : ['#E9EDEF', '#CBD3D8', '#F1F4F5', '#BFC8CE'];
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="' + c[0] + '"/><stop offset=".45" stop-color="' + c[1] + '"/>'
      + '<stop offset=".7" stop-color="' + c[2] + '"/><stop offset="1" stop-color="' + c[3] + '"/></linearGradient></defs>'
      + '<rect width="1600" height="900" fill="url(#g)"/>';
    for (let i = 0; i < 45; i++) {
      svg += '<rect y="' + (i * 20) + '" width="1600" height="1.1" fill="#ffffff" opacity="' + (i % 3 === 0 ? '.16' : '.07') + '"/>';
    }
    svg += '<text x="70" y="810" font-family="Arial" font-size="26" letter-spacing="8" fill="' + (dark ? '#8FA1AF' : '#5C6B76') + '">' + label.toUpperCase() + ' · KLARMANN</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  document.querySelectorAll('img[data-fbk]').forEach(img => {
    const label = img.getAttribute('data-fbk');
    const dark = label === 'hero';
    const useFbk = () => { img.src = steelSvg(dark ? 'Edelstahl seit 1948' : label, dark); img.removeAttribute('data-fbk'); };
    img.addEventListener('error', useFbk, { once: true });
    /* Synchron-Check nur für frei stehende <img> — Bilder in <picture> haben
       bereits die native WebP→JPG-Fallbackkette; dort würde complete=true bei
       noch nicht dekodiertem naturalWidth=0 den Platzhalter fälschlich auslösen */
    if (!img.closest('picture') && img.complete && img.naturalWidth === 0) useFbk();
  });

  /* ---------- Navigation: aktiver Menüpunkt ---------- */
  const page = document.body.dataset.page;
  if (page) {
    document.querySelectorAll('[data-nav="' + page + '"]').forEach(el => el.classList.add('is-active'));
  }

  /* ---------- Navigation: Dropdowns (Touch, Hover & Tastatur) ---------- */
  const touchOnly = window.matchMedia('(hover: none)').matches;
  document.querySelectorAll('.nav-item').forEach(item => {
    const trigger = item.querySelector('.nav-link');
    const dropdown = item.querySelector('.nav-dropdown');
    if (!trigger || !dropdown) return;
    /* aria-expanded mit dem tatsächlichen Zustand (Maus + Tastatur) synchron halten,
       damit Screenreader das Aufklappen mitbekommen */
    const setExpanded = state => trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
    item.addEventListener('mouseenter', () => setExpanded(true));
    item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) setExpanded(false); });
    item.addEventListener('focusin', () => setExpanded(true));
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) setExpanded(false); });
    if (touchOnly) {
      trigger.addEventListener('click', e => {
        if (!item.classList.contains('is-open')) {
          e.preventDefault();
          document.querySelectorAll('.nav-item.is-open').forEach(o => o.classList.remove('is-open'));
          item.classList.add('is-open');
          setExpanded(true);
        }
      });
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item.is-open').forEach(o => o.classList.remove('is-open'));
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-item.is-open').forEach(o => o.classList.remove('is-open'));
      /* Fokus aus dem offenen Dropdown nehmen, damit es via :focus-within schließt */
      const inNav = document.activeElement && document.activeElement.closest('.nav-item');
      if (inNav) inNav.querySelector('.nav-link').focus();
    }
  });

  /* ---------- Hero-Slider ---------- */
  const heroSlider = document.querySelector('[data-hero-slider]');
  const heroSlides = heroSlider ? Array.from(heroSlider.querySelectorAll('.hero-slide')) : [];
  const heroDots = Array.from(document.querySelectorAll('[data-hero-dots] .hero-dot'));
  let activeHeroSlide = 0;
  let heroSliderTimer = null;

  function setHeroSlide(index) {
    if (!heroSlides.length) return;
    activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, i) => {
      const active = i === activeHeroSlide;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    heroDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeHeroSlide);
    });
  }

  function startHeroSlider() {
    if (reduceMotion || heroSlides.length < 2) return;
    window.clearInterval(heroSliderTimer);
    heroSliderTimer = window.setInterval(() => setHeroSlide(activeHeroSlide + 1), 5500);
  }

  if (heroSlides.length) {
    setHeroSlide(0);
    heroDots.forEach(dot => {
      dot.addEventListener('click', () => {
        setHeroSlide(Number(dot.dataset.slide || 0));
        startHeroSlider();
      });
    });
    startHeroSlider();
  }

  /* ---------- Overlay-Menü (mobil) ---------- */
  const menuBtn = document.querySelector('button[data-icon="menu"]');
  const closeBtn = document.querySelector('button[data-icon="close"]');
  const sideNav = document.getElementById('side-nav');
  let navOpen = false;

  function openNav() {
    navOpen = true;
    sideNav.removeAttribute('inert'); /* wieder fokussierbar */
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    if (hasGsap && !reduceMotion) {
      gsap.to(sideNav, { yPercent: 0, opacity: 1, pointerEvents: 'all', duration: 0.8, ease: "power4.out", overwrite: true });
    } else {
      sideNav.style.transform = 'none'; sideNav.style.opacity = 1; sideNav.style.pointerEvents = 'all';
    }
    /* Fokus in das Menü holen (Schließen-Button) */
    if (closeBtn) closeBtn.focus();
  }
  function closeNav() {
    navOpen = false;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    if (hasGsap && !reduceMotion) {
      gsap.to(sideNav, { yPercent: 100, opacity: 0, pointerEvents: 'none', duration: 0.6, ease: "power4.in", overwrite: true });
    } else {
      sideNav.style.transform = 'translateY(100%)'; sideNav.style.opacity = 0; sideNav.style.pointerEvents = 'none';
    }
    sideNav.setAttribute('inert', ''); /* geschlossen: raus aus Tab-Reihenfolge & A11y-Baum */
    if (menuBtn) menuBtn.focus(); /* Fokus zurück zum Auslöser */
  }
  /* Tastatur-Falle: solange das Overlay offen ist, Tab innerhalb des Menüs halten */
  function trapFocus(e) {
    if (!navOpen || e.key !== 'Tab') return;
    const f = sideNav.querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (menuBtn && closeBtn && sideNav) {
    if (hasGsap) { gsap.set(sideNav, { yPercent: 100, opacity: 0, pointerEvents: 'none' }); }
    else { sideNav.style.transform = 'translateY(100%)'; sideNav.style.opacity = 0; sideNav.style.pointerEvents = 'none'; }
    sideNav.setAttribute('inert', ''); /* startet geschlossen */
    menuBtn.addEventListener('click', openNav);
    closeBtn.addEventListener('click', closeNav);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && navOpen) closeNav(); });
    sideNav.addEventListener('keydown', trapFocus);
    sideNav.querySelectorAll('.nav-anchor').forEach(a => a.addEventListener('click', closeNav));
  }

  /* ---------- Lenis Smooth Scrolling ---------- */
  let lenis = null;
  if (hasLenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  }

  /* ---------- GSAP ScrollTrigger ---------- */
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    if (!reduceMotion) {
      // Hero-Parallaxe
      if (document.getElementById('hero-slider')) {
        gsap.to("#hero-slider", {
          yPercent: 15, ease: "none",
          scrollTrigger: { trigger: "header", start: "top top", end: "bottom top", scrub: true }
        });
      }

      // Headline-Fades (ohne Overlay-Menü und Produktkarten)
      /* Hero-Headlines (im <header>) und Seiten-H1s nicht animieren — sie sind
         das LCP-Element und müssen beim ersten Paint sichtbar sein */
      const headlines = gsap.utils.toArray(".font-headline:not(h1):not(header .font-headline):not(#side-nav .font-headline):not(#produkte .project-card .font-headline):not(.ref-card .font-headline):not(.ref-detail .font-headline):not(.ref-dialog .font-headline)");
      headlines.forEach(headline => {
        gsap.from(headline, {
          scrollTrigger: { trigger: headline, start: "top 85%", toggleActions: "play none none reverse" },
          y: 40, opacity: 0, duration: 1.2, ease: "power3.out"
        });
      });

      // Ansatz-Sektion: Steps + Bildquartett
      const craftSection = document.getElementById('craft-section');
      if (craftSection) {
        gsap.from("#craft-section .border-l", {
          scrollTrigger: { trigger: "#craft-section .space-y-8", start: "top 85%", toggleActions: "play none none reverse" },
          x: -20, opacity: 0, duration: 1, stagger: 0.15, ease: "power3.out"
        });
        gsap.utils.toArray("#craft-section .aspect-square").forEach(imgWrap => {
          gsap.from(imgWrap, {
            scrollTrigger: { trigger: imgWrap, start: "top 92%", toggleActions: "play none none reverse" },
            y: 80, opacity: 0, duration: 1.4, ease: "power4.out"
          });
          const img = imgWrap.querySelector('img');
          if (img) {
            gsap.to(img, {
              yPercent: 20, scale: 1.1, ease: "none",
              scrollTrigger: { trigger: imgWrap, start: "top bottom", end: "bottom top", scrub: true }
            });
          }
        });
      }

      // Parallaxe in den Produktkarten
      gsap.utils.toArray(".project-card img").forEach(img => {
        // Trigger = Karte selbst (robust auch bei <picture>-Wrapper um das Bild)
        const trig = img.closest('.project-card') || img.parentElement;
        gsap.to(img, {
          yPercent: 15, scale: 1.05, ease: "none",
          scrollTrigger: { trigger: trig, start: "top bottom", end: "bottom top", scrub: true }
        });
      });

      // Produktbereiche: gescrubbter Curtain-Reveal (Pattern: References)
      const refCards = gsap.utils.toArray('#produkte .project-card');
      if (refCards.length) {
        gsap.set(refCards, { clipPath: 'inset(100% 0 0% 0)' });
        refCards.forEach((card) => {
          gsap.to(card, {
            clipPath: 'inset(0% 0 0% 0)', ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 18%', scrub: 1.2 }
          });
        });
      }
    }
  }

  /* ---------- Anker-Scrolling ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') { e.preventDefault(); return; }
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) { lenis.scrollTo(target, { offset: -90 }); }
      else { target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });
  });
});
