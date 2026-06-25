document.addEventListener("DOMContentLoaded", function () {
  document.title = "QRZMail Webmail";

  var loginForm = document.forms.namedItem("loginForm");
  if (loginForm) {
    window.location.href = "/user";
  }

  var style = document.createElement("style");
  style.textContent = [
    "body { font-family: Arial, Helvetica, sans-serif; }",
    ".md-toolbar-tools, md-toolbar.md-default-theme:not(.md-menu-toolbar), md-toolbar:not(.md-menu-toolbar) { background-color: #0b63ce !important; color: #fff !important; }",
    ".sg-logo, .sg-logo * { color: #fff !important; }",
    ".md-button.md-primary, .md-button.md-primary.md-raised { background-color: #0b63ce !important; }",
    ".md-button.md-primary:not([disabled]) md-icon, .md-button.md-primary:not([disabled]) { color: #0b63ce; }",
    ".md-sidenav-left, md-sidenav { border-right: 1px solid #dce5f2; }",
    ".sg-folder-selected, .md-list-item-text .selected { color: #0b63ce !important; }",
    ".qrzmail-webmail-badge { position: fixed; right: 18px; bottom: 14px; z-index: 20; padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,.92); border: 1px solid #dce5f2; color: #65758b; font-size: 12px; box-shadow: 0 10px 30px rgba(16,32,51,.12); }"
  ].join("\n");
  document.head.appendChild(style);

  var badge = document.createElement("div");
  badge.className = "qrzmail-webmail-badge";
  badge.textContent = "QRZMail Webmail";
  document.body.appendChild(badge);

  brandVersionText();
  brandTooltips();
  new MutationObserver(function () {
    brandVersionText();
    brandTooltips();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
});

function brandVersionText() {
  if (!document.body) {
    return;
  }

  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var node;

  while ((node = walker.nextNode())) {
    var value = node.nodeValue || "";
    var branded = value
      .replace(/mailcow preferences/ig, "QRZMail preferences")
      .replace(/mailcow/ig, "QRZMail")
      .replace(/SOGo Version/g, "QRZMail Webmail")
      .replace(/SOGo version/g, "QRZMail webmail")
      .replace(/\bSOGo\b/g, "QRZMail Webmail")
      .replace(/\bSOGO\b/g, "QRZMail Webmail")
      .replace(/\b5\.12\.8\b/g, "QRZMail 2026");

    if (branded !== value) {
      node.nodeValue = branded;
    }
  }
}

function brandTooltips() {
  var attributes = ["title", "aria-label", "data-original-title", "data-bs-original-title"];
  var elements = document.querySelectorAll("[title], [aria-label], [data-original-title], [data-bs-original-title]");

  elements.forEach(function (element) {
    attributes.forEach(function (attribute) {
      var value = element.getAttribute(attribute);
      if (!value) {
        return;
      }

      var branded = value
        .replace(/mailcow preferences/ig, "QRZMail preferences")
        .replace(/mailcow/ig, "QRZMail")
        .replace(/\bSOGo\b/g, "QRZMail Webmail")
        .replace(/\bSOGO\b/g, "QRZMail Webmail");

      if (branded !== value) {
        element.setAttribute(attribute, branded);
      }
    });
  });
}

function mc_logout() {
  fetch("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "logout=1"
  }).finally(function () {
    window.location.href = "https://qrzmail.com/login";
  });
}

CKEDITOR.addCss("body {font-size: 16px !important}");
