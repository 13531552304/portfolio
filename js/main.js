(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const site = window.SITE || {};
  const works = window.WORKS || [];
  const HERO_IMAGE = "assets/top-bg.jpg";

  const state = {
    filter: "全部",
    activeId: null,
    lastTrigger: null,
    lightbox: {
      open: false,
      workId: null,
      index: 0,
    },
  };

  let lightboxApi = null;
  let galleryCurrentIndex = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function splitTitle(text) {
    return text
      .split("/")
      .map((part, index, parts) =>
        index < parts.length - 1 ? `${part.trim()} /` : part.trim(),
      )
      .filter((part) => part.trim().length > 0);
  }

  function initSite() {
    initLightbox();
    document.title = `${site.brand} · ${site.title}`;
    $("[data-brand]").textContent = site.brand;
    $("[data-hero-eyebrow]").textContent = site.eyebrow;

    const titleEl = $("[data-hero-title]");
    titleEl.innerHTML = splitTitle(site.title)
      .map((line) => `<span><span>${escapeHtml(line)}</span></span>`)
      .join("");

    $("[data-hero-tag]").textContent = site.tagline;
    $(".hero__media").style.backgroundImage = `url('${HERO_IMAGE}')`;
    $("[data-about-text]").textContent = site.about;

    const emailEl = $("[data-email]");
    emailEl.textContent = site.email;
    emailEl.setAttribute("href", `mailto:${site.email}`);
    $("[data-location]").textContent = site.location;
    $("[data-footer-brand]").textContent = site.brand;

    renderSkills();
    renderFilters();
    renderWorks();

    $$(".section-head, .about__grid, .contact__inner").forEach((el) => {
      el.classList.add("reveal");
    });
    observeReveals();
  }

  function renderSkills() {
    const list = $("[data-skill-list]");
    (site.skills || []).forEach((skill) => {
      const item = document.createElement("li");
      item.textContent = skill;
      list.appendChild(item);
    });
  }

  function renderFilters() {
    const categories = [
      "全部",
      ...new Set(works.map((work) => work.category)),
    ];
    const wrap = $("[data-filters]");
    wrap.innerHTML = "";

    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-btn";
      button.classList.toggle("is-active", category === state.filter);
      button.setAttribute("aria-pressed", String(category === state.filter));
      button.textContent = category;
      button.addEventListener("click", () => {
        state.filter = category;
        $$(".filter-btn").forEach((btn) => {
          const active = btn.textContent === category;
          btn.classList.toggle("is-active", active);
          btn.setAttribute("aria-pressed", String(active));
        });
        renderWorks();
      });
      wrap.appendChild(button);
    });
  }

  function renderWorks() {
    const list = $("[data-work-list]");
    const visible = works.filter(
      (work) => state.filter === "全部" || work.category === state.filter,
    );

    if (!visible.length) {
      list.innerHTML = '<p class="empty-state">该分类下暂无作品</p>';
      return;
    }

    list.innerHTML = "";
    visible.forEach((work, index) => {
      const link = document.createElement("a");
      link.href = `?work=${encodeURIComponent(work.slug)}`;
      link.className = "work-row";
      link.setAttribute("aria-label", `查看作品：${work.title}`);

      link.innerHTML = `
        <span class="work-row__index">${escapeHtml(work.index)}</span>
        <span class="work-row__media">
          <img src="${escapeHtml(work.cover)}" alt="" loading="lazy" />
        </span>
        <span class="work-row__info">
          <span class="work-row__cat">${escapeHtml(work.category)}</span>
          <span class="work-row__title">${escapeHtml(work.title)}</span>
          <span class="work-row__summary">${escapeHtml(work.summary)}</span>
          <span class="work-row__meta">${escapeHtml(work.role)} · ${escapeHtml(
            work.year,
          )}</span>
        </span>
        <span class="work-row__arrow" aria-hidden="true">↗</span>
      `;

      const img = $("img", link);
      img.addEventListener("error", () => {
        img.closest(".work-row__media").classList.add("is-missing");
      });

      link.addEventListener("click", (event) => {
        event.preventDefault();
        state.lastTrigger = link;
        openWork(work.id);
      });

      link.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
      list.appendChild(link);
    });

    requestAnimationFrame(() => {
      $$(".work-row", list).forEach((row) => {
        row.classList.add("reveal");
      });
      observeReveals(list);
    });
  }

  function openWork(id, options = {}) {
    const work = works.find((item) => item.id === id);
    if (!work) return;

    state.activeId = id;
    renderDetail(work);

    const detail = $("[data-detail]");
    detail.classList.add("is-open");
    detail.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    $("[data-detail-body]").scrollTop = 0;
    $("[data-detail-close]").focus({ preventScroll: true });

    if (options.push !== false) {
      try {
        history.pushState(
          { work: id },
          "",
          `?work=${encodeURIComponent(work.slug)}`,
        );
      } catch {
        // file:// mode: URL history is optional.
      }
    }
  }

  function closeWork() {
    const detail = $("[data-detail]");
    if (!detail.classList.contains("is-open")) return;

    if (lightboxApi) lightboxApi.closeBox();
    detail.classList.remove("is-open");
    detail.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    state.activeId = null;

    if (state.lastTrigger && state.lastTrigger.isConnected) {
      state.lastTrigger.focus({ preventScroll: true });
    }

    if (history.state && history.state.work) {
      history.back();
    } else {
      try {
        const url = new URL(location.href);
        url.searchParams.delete("work");
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        // file:// mode: keep current URL.
      }
    }
  }

  function renderDetail(work) {
    const body = $("[data-detail-body]");
    const media = renderMedia(work);
    const gallery = renderGallery(work);
    const pdf = renderPdf(work);

    body.innerHTML = `
      <header class="detail__header">
        <p class="detail__cat">${escapeHtml(work.category)} · ${escapeHtml(
          work.year,
        )}</p>
        <h2 class="detail__title">${escapeHtml(work.title)}</h2>
        <p class="detail__summary">${escapeHtml(work.summary)}</p>
        ${
          work.sizeNote
            ? `<p class="detail__note">${escapeHtml(work.sizeNote)}</p>`
            : ""
        }
      </header>
      ${media}
      ${gallery}
      <div class="detail__grid">
        <div>
          <p class="detail__section-label">作品说明</p>
          <p class="detail__desc">${escapeHtml(work.summary)}</p>
          ${pdf}
        </div>
        <div>
          <p class="detail__section-label">项目信息</p>
          <ul class="meta-list">
            <li><dt>角色</dt><dd>${escapeHtml(work.role)}</dd></li>
            <li><dt>年份</dt><dd>${escapeHtml(work.year)}</dd></li>
            <li><dt>工具</dt><dd>${escapeHtml(work.tools.join(" / "))}</dd></li>
          </ul>
        </div>
      </div>
    `;

    bindMediaFallbacks(work);
    bindGallery(work);
  }

  function renderMedia(work) {
    if (work.videos && work.videos.length) {
      const tabs =
        work.videos.length > 1
          ? `
            <div class="video-tabs" role="group" aria-label="Demo 切换">
              ${work.videos
                .map(
                  (video, index) => `
                    <button
                      class="video-tab${index === 0 ? " is-active" : ""}"
                      type="button"
                      data-video-index="${index}"
                      aria-pressed="${index === 0}"
                    >${escapeHtml(video.label)}</button>
                  `,
                )
                .join("")}
            </div>
          `
          : "";

      return `
        ${tabs}
        <div class="detail__media" data-media>
          <video
            src="${escapeHtml(work.videos[0].src)}"
            poster="${escapeHtml(work.videos[0].poster || work.cover)}"
            controls
            preload="auto"
            playsinline
            webkit-playsinline
            x5-playsinline
            x5-video-player-type="h5"
          ></video>
        </div>
      `;
    }

    if (work.pdf) {
      const desktop = window.matchMedia("(min-width: 861px)").matches;
      if (!desktop) {
        return `
          <div class="pdf-mobile">
            <a
              class="pdf-mobile__link"
              href="${escapeHtml(work.pdf)}"
              target="_blank"
              rel="noopener"
            >
              <span class="pdf-mobile__label">打开 PDF 拆解案</span>
              <span class="pdf-mobile__hint">将在浏览器新标签页打开</span>
            </a>
          </div>
        `;
      }
      return `
        <iframe
          class="pdf-frame"
          src="${escapeHtml(work.pdf)}"
          title="${escapeHtml(work.title)} PDF"
          loading="lazy"
        ></iframe>
      `;
    }

    if (work.images && work.images.length) {
      return "";
    }

    return `
      <div class="media-missing">
        <div>
          <strong>等待素材</strong>
          <span>请将视频放入 ${escapeHtml(work.slug)} 对应目录</span>
        </div>
      </div>
    `;
  }

  function renderGallery(work) {
    if (!work.images || !work.images.length) return "";

    const thumbs = work.images
      .map(
        (image, index) => `
          <button
            class="gallery__thumb${index === 0 ? " is-active" : ""}"
            type="button"
            aria-label="查看 ${escapeHtml(image.caption || `图片 ${index + 1}`)}"
            data-gallery-index="${index}"
          >
            <img src="${escapeHtml(image.src)}" alt="" loading="lazy" />
          </button>
        `,
      )
      .join("");

    return `
      <div class="detail__gallery">
        <div class="gallery__main">
          <img
            src="${escapeHtml(work.images[0].src)}"
            alt="${escapeHtml(work.images[0].caption || work.title)}"
            data-gallery-main
          />
        </div>
        ${
          work.images.length > 1
            ? `<div class="gallery__thumbs" data-gallery-thumbs>${thumbs}</div>`
            : ""
        }
      </div>
    `;
  }

  function renderPdf(work) {
    if (!work.pdf) return "";

    return `
      <a
        class="pdf-action"
        href="${escapeHtml(work.pdf)}"
        target="_blank"
        rel="noopener"
      >
        <span>查看 PDF</span>
        <span aria-hidden="true">↗</span>
      </a>
    `;
  }

  function bindMediaFallbacks(work) {
    const video = $("[data-media] video");
    if (video) {
      video.addEventListener("error", () => {
        const holder = $("[data-media]");
        holder.innerHTML = missingMediaHtml("视频素材待补充", video.src);
      });
      video.load();

      $$("[data-video-index]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.videoIndex);
          const item = work.videos[index];
          if (!item) return;

          video.src = item.src;
          video.poster = item.poster || work.cover;
          video.load();
          const play = video.play();
          if (play && typeof play.catch === "function") {
            play.catch(() => {});
          }
          if (typeof item.galleryIndex === "number") {
            updateGalleryImage(work, item.galleryIndex);
          }

          $$("[data-video-index]").forEach((btn) => {
            const active = btn === button;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-pressed", String(active));
          });
        });
      });
    }
  }

  function updateGalleryImage(work, index) {
    const main = $("[data-gallery-main]");
    if (!main || !work.images || !work.images.length) return;

    const nextIndex = Math.max(
      0,
      Math.min(index, work.images.length - 1),
    );
    const image = work.images[nextIndex];
    galleryCurrentIndex = nextIndex;
    main.src = image.src;
    main.alt = image.caption || work.title;

    $$("[data-gallery-index]").forEach((btn) => {
      const active = Number(btn.dataset.galleryIndex) === nextIndex;
      btn.classList.toggle("is-active", active);
    });
  }

  function bindGallery(work) {
    const main = $("[data-gallery-main]");
    if (!main) return;
    const wrap = main.closest(".gallery__main");
    galleryCurrentIndex = 0;

    function applyLongMode() {
      const isLong = main.naturalHeight > main.naturalWidth * 1.15;
      wrap.classList.toggle("is-long", isLong);
    }

    main.addEventListener("load", applyLongMode);
    main.addEventListener("error", () => {
      main.src = work.cover;
    });
    main.addEventListener("click", () => {
      if (lightboxApi) lightboxApi.open(work.id, galleryCurrentIndex);
    });

    $$("[data-gallery-index]").forEach((thumb) => {
      const img = $("img", thumb);
      img.addEventListener("error", () => {
        img.src = work.cover;
      });

      thumb.addEventListener("click", () => {
        updateGalleryImage(work, Number(thumb.dataset.galleryIndex));
      });
    });

    if (main.complete) applyLongMode();
  }

  function initLightbox() {
    const lightbox = $("[data-lightbox]");
    const img = $("[data-lightbox-img]");
    const caption = $("[data-lightbox-caption]");
    const prev = $("[data-lightbox-prev]");
    const next = $("[data-lightbox-next]");
    const close = $("[data-lightbox-close]");

    function render() {
      const work = works.find((item) => item.id === state.lightbox.workId);
      if (!work || !work.images || !work.images.length) return;

      const images = work.images;
      const index = Math.max(
        0,
        Math.min(state.lightbox.index, images.length - 1),
      );
      state.lightbox.index = index;
      const item = images[index];

      img.src = item.src;
      img.alt = item.caption || work.title;
      caption.textContent = `${work.title} · ${item.caption || `图片 ${index + 1}`}`;

      const single = images.length <= 1;
      prev.classList.toggle("is-hidden", single);
      next.classList.toggle("is-hidden", single);
    }

    function open(workId, index) {
      state.lightbox.open = true;
      state.lightbox.workId = workId;
      state.lightbox.index = index || 0;
      render();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");
      close.focus({ preventScroll: true });
    }

    function closeBox() {
      if (!state.lightbox.open) return;
      state.lightbox.open = false;
      state.lightbox.workId = null;
      state.lightbox.index = 0;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      if (!$("[data-detail]").classList.contains("is-open")) {
        document.body.classList.remove("no-scroll");
      }
    }

    function step(delta) {
      const work = works.find((item) => item.id === state.lightbox.workId);
      if (!work || !work.images || work.images.length < 2) return;
      state.lightbox.index =
        (state.lightbox.index + delta + work.images.length) % work.images.length;
      render();
    }

    close.addEventListener("click", closeBox);
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));

    let startX = 0;
    let startY = 0;
    lightbox.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      },
      { passive: true },
    );
    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (!state.lightbox.open) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          step(deltaX < 0 ? 1 : -1);
        }
      },
      { passive: true },
    );

    lightboxApi = { open, closeBox, step };
  }

  function missingMediaHtml(label, path) {
    return `
      <div class="media-missing">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(path)}</span>
          <span>将文件放入站点后会自动显示</span>
        </div>
      </div>
    `;
  }

  function observeReveals(scope) {
    const root = scope || document;
    $$(".reveal", root).forEach((el) => {
      if (!el.dataset.observed) {
        el.dataset.observed = "1";
        revealObserver.observe(el);
      }
    });
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  window.addEventListener(
    "scroll",
    () => {
      $("[data-header]").classList.toggle("is-scrolled", window.scrollY > 40);
    },
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.lightbox.open) {
        if (lightboxApi) lightboxApi.closeBox();
      } else {
        closeWork();
      }
    }
    if (
      state.lightbox.open &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      if (lightboxApi) {
        lightboxApi.step(event.key === "ArrowLeft" ? -1 : 1);
      }
    }
  });

  $("[data-detail-close]").addEventListener("click", closeWork);

  window.addEventListener("popstate", () => {
    const slug = new URLSearchParams(location.search).get("work");
    const work = works.find((item) => item.slug === slug);
    if (work && state.activeId !== work.id) {
      openWork(work.id, { push: false });
    } else if (!work && state.activeId) {
      closeWork();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    initSite();

    const slug = new URLSearchParams(location.search).get("work");
    const work = works.find((item) => item.slug === slug);
    if (work) {
      openWork(work.id, { push: false });
    }
  });
})();
