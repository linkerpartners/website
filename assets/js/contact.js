/* 문의 양식: 입력을 확인한 뒤 LP_INQUIRY(inquiry.js)로 보냅니다. 폼 서비스 주소(config.js의 form.endpoint)가 있으면 서버로,
   없으면 사용 중인 메일 앱에 내용을 채워서 엽니다.
   - 견적 계산기에서 넘어오면(?services=a,b&est=요약) 관심 서비스가 골라져 있고, 고른 구성이 문의 내용에 채워집니다. */
(function () {
  "use strict";
  const form = document.getElementById("contact-form");
  if (!form) return;

  const cfg = window.LP_CONFIG;
  const t = function (key) {
    return (window.LP_I18N && LP_I18N.t(key)) || "";
  };
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const params = new URLSearchParams(location.search);
  const preset = (params.get("services") || "").split(",").filter(Boolean);
  const estimate = params.get("est") || ""; // 견적 계산기에서 고른 구성 (문의 내용에 미리 채움)

  function hintFor(input) {
    const id = input.getAttribute("aria-describedby");
    return id ? document.getElementById(id) : null;
  }

  function setError(input, message) {
    const field = input.closest(".field");
    const hint = hintFor(input);
    if (field) field.classList.toggle("is-error", !!message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (hint) hint.textContent = message || "";
  }

  function check(input) {
    if (input.type === "checkbox") return input.required && !input.checked ? t("contact.form.error_consent") : "";
    const value = input.value.trim();
    if (input.required && !value) return t("contact.form.error_required");
    if (input.type === "email" && value && !EMAIL_RE.test(value)) return t("contact.form.error_email");
    return "";
  }

  function required() {
    return form.querySelectorAll("input[required], textarea[required]");
  }

  // 오류가 난 칸은 고치는 즉시 다시 확인
  form.addEventListener("input", function (e) {
    const input = e.target;
    if (input.getAttribute("aria-invalid") === "true") setError(input, check(input));
  });
  form.addEventListener("change", function (e) {
    const input = e.target;
    if (input.getAttribute("aria-invalid") === "true") setError(input, check(input));
  });

  function label(select) {
    const o = select.options[select.selectedIndex];
    return o ? o.textContent : "-";
  }

  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-form-status]");

  function setStatus(kind, message) {
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-error", kind === "error");
  }

  async function send() {
    const el = form.elements;
    const picked = Array.from(form.querySelectorAll('input[name="services"]:checked')).map(function (i) {
      return i.nextElementSibling.textContent.replace(/[\u00a0\u2060]/g, " ");
    });
    const company = el.company.value.trim();
    const direction = label(el.direction);
    const subject = t("contact.form.mail_subject") + " " + (company || el.name.value.trim());
    const data = {
      name: el.name.value.trim(),
      company: company || "-",
      email: el.email.value.trim(),
      direction: direction,
      services: picked.join(", ") || "-",
      message: el.message.value.trim(),
      website: el.website ? el.website.value : "",
    };
    const rows = [
      [t("contact.form.name"), data.name],
      [t("contact.form.company"), data.company],
      [t("contact.form.email"), data.email],
      [t("contact.form.direction"), direction],
      [t("contact.form.services"), data.services],
    ];
    button.disabled = true;
    setStatus("", t("contact.form.sending"));
    const result = await window.LP_INQUIRY.send({ subject: subject, data: data, rows: rows });
    button.disabled = false;
    if (result.mode === "mail") return setStatus("", "");
    if (result.ok) {
      form.reset();
      form.querySelectorAll(".is-error").forEach(function (f) {
        f.classList.remove("is-error");
      });
      setStatus("ok", t("contact.form.success"));
    } else {
      setStatus("error", t("contact.form.error").replace("{email}", cfg.email));
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (button.disabled) return;
    let firstInvalid = null;
    required().forEach(function (input) {
      const message = check(input);
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    send();
  });

  // 언어를 바꾸면 선택지가 새로 그려지므로 고른 서비스를 다시 표시하고, 보이는 오류 문구도 다시 번역
  document.addEventListener("lp:langchange", function () {
    form.querySelectorAll('input[name="services"]').forEach(function (i) {
      if (preset.indexOf(i.value) !== -1) i.checked = true;
    });
    if (estimate && !form.elements.message.value.trim()) form.elements.message.value = estimate + "\n\n";
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (input) {
      setError(input, check(input));
    });
  });
})();
