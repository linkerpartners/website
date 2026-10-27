/* 문의 보내기 (문의 페이지의 양식과 모든 페이지 아래의 빠른 문의가 함께 씁니다)
   LP_INQUIRY.send({ subject, data, rows }) → Promise<{ mode, ok }>
   - data: 서버로 보낼 값 { name, email, company, direction, services, message, ... }
   - rows: 메일 앱으로 열 때 본문에 적을 [이름표, 값] 목록
   - config.js의 form.endpoint가 있으면 서버(폼 서비스)로 보내고 { mode: "server" }, 없으면 메일 앱을 열고 { mode: "mail" }
   - 스팸 막기: 사람 눈에는 안 보이는 칸(website)에 값이 있으면 보낸 척만 하고 실제로는 보내지 않습니다
   - 15초 안에 응답이 없거나 오류면 ok:false (화면에서 직접 메일 주소를 안내) */
(function () {
  "use strict";
  const cfg = window.LP_CONFIG;
  const form = cfg.form || {};
  const TIMEOUT = 15000;

  function mailto(subject, rows, message) {
    const lines = rows.map(function (r) {
      return r[0] + ": " + r[1];
    });
    lines.push("", message);
    window.location.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  async function post(subject, data) {
    const body = Object.assign({}, form.fields || {}, data);
    body[form.subjectKey || "_subject"] = subject;
    body.page = window.location.href;
    body.lang = (document.documentElement.lang || "").slice(0, 2);
    const ctrl = new AbortController();
    const timer = window.setTimeout(function () {
      ctrl.abort();
    }, TIMEOUT);
    try {
      const res = await fetch(form.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) return false;
      let json = {};
      try {
        json = await res.json();
      } catch (e) {
        /* 본문이 JSON이 아니어도 상태 코드가 정상이면 성공 */
      }
      return json.success !== false && json.ok !== false;
    } catch (e) {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  }

  window.LP_INQUIRY = {
    send: async function (opts) {
      const data = opts.data || {};
      if (data.website) return { mode: "server", ok: true }; // 스팸으로 보고 조용히 넘김
      delete data.website;
      if (!form.endpoint) {
        mailto(opts.subject, opts.rows || [], data.message || "");
        return { mode: "mail", ok: true };
      }
      return { mode: "server", ok: await post(opts.subject, data) };
    },
  };
})();
