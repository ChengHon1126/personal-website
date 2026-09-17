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
const CONTACT_API_URL = "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/contact";

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
  if (!contactForm.checkValidity()) {
    contactForm.querySelectorAll("input, textarea").forEach((field) => field.setAttribute("data-touched", "true"));
    setContactStatus("請確認欄位都已正確填寫。", "error");
    return;
  }

  const formData = new FormData(contactForm);
  const payload = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

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
