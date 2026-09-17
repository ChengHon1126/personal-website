// 行動選單開關
const navToggle = document.querySelector<HTMLButtonElement>("#nav-toggle");
const navLinks = document.querySelector<HTMLElement>("#nav-links");

const setNavOpen = (isOpen: boolean): void => {
  navLinks?.classList.toggle("open", isOpen);
  navToggle?.setAttribute("aria-expanded", String(isOpen));
  navToggle?.setAttribute("aria-label", isOpen ? "關閉選單" : "開啟選單");
};

navToggle?.addEventListener("click", () => {
  setNavOpen(!navLinks?.classList.contains("open"));
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    setNavOpen(false);
  });
});

// Scrollspy：捲動時高亮目前所在區塊的導覽連結
const sections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
const navItems = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-nav]"));

const setActiveLink = (id: string): void => {
  navItems.forEach((link) => {
    const matches = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("active", matches);
  });
};

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveLink(entry.target.id);
      }
    });
  },
  { rootMargin: "0px 0px -70% 0px" }
);

sections.forEach((section) => spyObserver.observe(section));

// 捲到頁面最底部時，最後一個區塊的短內容可能永遠不會進入偵測線，強制標記為目前所在區塊
const lastSectionId = sections[sections.length - 1]?.id;

const highlightIfAtBottom = (): void => {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom && lastSectionId) {
    setActiveLink(lastSectionId);
  }
};

window.addEventListener("scroll", highlightIfAtBottom, { passive: true });
highlightIfAtBottom();

// 聯絡表單：送到 API Gateway，由後端 Lambda 呼叫 SES 寄信
// TODO: 換成實際部署的 API Gateway / Lambda Function URL
const CONTACT_API_URL = "https://b2z16m5mwd.execute-api.ap-northeast-1.amazonaws.com/contact";

const envelopeCard = document.querySelector<HTMLElement>("#envelope-card");
const envelopeCardBody = document.querySelector<HTMLElement>(".envelope-card-body");
const envelopeSuccess = document.querySelector<HTMLElement>(".envelope-success");
const contactForm = document.querySelector<HTMLFormElement>("#contact-form");
const contactSubmit = document.querySelector<HTMLButtonElement>("#contact-submit");
const contactStatus = document.querySelector<HTMLParagraphElement>("#contact-status");

// 送出成功後，卡片要從表單的高度平滑縮到成功訊息的高度，而不是直接留一大塊空白
const sealEnvelope = (): void => {
  if (!envelopeCard || !envelopeCardBody || !envelopeSuccess) {
    envelopeCard?.classList.add("sent");
    return;
  }

  const bodyStyle = getComputedStyle(envelopeCardBody);
  const verticalPadding = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
  const currentHeight = envelopeCardBody.getBoundingClientRect().height;
  const successHeight = envelopeSuccess.getBoundingClientRect().height + verticalPadding;

  envelopeCardBody.style.height = `${currentHeight}px`;
  void envelopeCardBody.offsetHeight; // 強制 reflow，讓上面設定的高度先生效再過渡
  envelopeCard.classList.add("sent");
  envelopeCardBody.style.height = `${successHeight}px`;

  // 過渡動畫跑完後把寫死的高度放掉，改回自動高度
  // （.envelope-card.sent .contact-form 已經用 position: absolute 移出版面計算，
  //   所以放掉高度後只會依 .envelope-success 的實際大小自動調整，不會跳回表單的高度）
  window.setTimeout(() => {
    envelopeCardBody.style.height = "";
  }, 500);
};

const setContactStatus = (text: string, state?: "success" | "error"): void => {
  if (!contactStatus) return;
  contactStatus.textContent = text;
  if (state) {
    contactStatus.setAttribute("data-state", state);
  } else {
    contactStatus.removeAttribute("data-state");
  }
};

contactForm?.querySelectorAll("input, textarea").forEach((field) => {
  field.addEventListener("blur", () => field.setAttribute("data-touched", "true"));
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);

  // 蜜罐欄位：一般使用者看不到也不會填，機器人會直接找 input 填值，填了就當作垃圾訊息偷偷擋掉
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    setContactStatus("訊息已送出，我會盡快回覆你！", "success");
    sealEnvelope();
    contactForm.reset();
    return;
  }

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
  };

  // required 屬性只檢查長度是否為 0，不會擋掉只打空白鍵的內容，這裡額外檢查 trim 過的值
  const hasBlankField = !payload.name || !payload.email || !payload.message;

  if (!contactForm.checkValidity() || hasBlankField) {
    contactForm.querySelectorAll("input, textarea").forEach((field) => field.setAttribute("data-touched", "true"));
    setContactStatus("請確認欄位都已正確填寫。", "error");
    return;
  }

  if (contactSubmit) contactSubmit.disabled = true;
  setContactStatus("傳送中...");

  try {
    const response = await fetch(CONTACT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`request failed with status ${response.status}`);
    }

    setContactStatus("訊息已送出，我會盡快回覆你！", "success");
    sealEnvelope();
    contactForm.reset();
    contactForm.querySelectorAll("input, textarea").forEach((field) => field.removeAttribute("data-touched"));
  } catch (error) {
    console.error("Failed to send contact message", error);
    setContactStatus("傳送失敗，請稍後再試，或直接寄信到 lkmd555@gmail.com。", "error");
  } finally {
    if (contactSubmit) contactSubmit.disabled = false;
  }
});

// Hero 流程圖：載入後畫一次連接線
const flowPath = document.querySelector<SVGPathElement>("#flow-path");

window.requestAnimationFrame(() => {
  flowPath?.classList.add("drawn");
});
