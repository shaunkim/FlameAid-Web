(() => {
  const containerId = "GTM-K23LRSC6";
  const consentKey = "flameAidAnalyticsConsent";
  const banner = document.querySelector("#analytics-consent");
  const acceptButton = document.querySelector("#accept-analytics");
  const declineButton = document.querySelector("#decline-analytics");
  const choicesButton = document.querySelector("#privacy-choices");

  if (!banner || !acceptButton || !declineButton || !choicesButton) return;

  let savedChoice = null;
  try {
    savedChoice = window.localStorage.getItem(consentKey);
  } catch {
    // The banner still works for this visit when storage is unavailable.
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  });

  function loadTagManager() {
    if (window.flameAidTagManagerLoaded) return;

    window.flameAidTagManagerLoaded = true;
    window.gtag("js", new Date());

    const firstScript = document.getElementsByTagName("script")[0];
    const tagManagerScript = document.createElement("script");
    tagManagerScript.async = true;
    tagManagerScript.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    firstScript.parentNode.insertBefore(tagManagerScript, firstScript);
  }

  function storeChoice(choice) {
    try {
      window.localStorage.setItem(consentKey, choice);
    } catch {
      // Keep the choice for the current page even if storage is unavailable.
    }

    window.gtag("consent", "update", {
      analytics_storage: choice === "granted" ? "granted" : "denied"
    });

    if (choice === "granted") {
      loadTagManager();
    } else if (window.flameAidTagManagerLoaded) {
      // Start a fresh page without the tag after consent is withdrawn.
      window.location.reload();
    }
    banner.hidden = true;
  }

  if (savedChoice === "granted") {
    window.gtag("consent", "update", { analytics_storage: "granted" });
    loadTagManager();
    banner.hidden = true;
  } else if (savedChoice === "denied") {
    banner.hidden = true;
  } else {
    banner.hidden = false;
  }

  acceptButton.addEventListener("click", () => storeChoice("granted"));
  declineButton.addEventListener("click", () => storeChoice("denied"));
  choicesButton.addEventListener("click", () => {
    banner.hidden = false;
    acceptButton.focus();
  });
})();
