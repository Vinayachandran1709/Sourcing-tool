(function initGoogleTag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", "G-CL9H5E02E9");
})();

(function initClarity(windowRef, documentRef, name, tagName, projectId) {
  windowRef[name] = windowRef[name] || function clarityQueue() {
    (windowRef[name].q = windowRef[name].q || []).push(arguments);
  };

  var script = documentRef.createElement(tagName);
  script.async = true;
  script.src = "https://www.clarity.ms/tag/" + projectId;

  var firstScript = documentRef.getElementsByTagName(tagName)[0];
  firstScript.parentNode.insertBefore(script, firstScript);
})(window, document, "clarity", "script", "vdohgv5xte");

function initApollo() {
  var cacheKey = Math.random().toString(36).substring(7);
  var script = document.createElement("script");

  script.src = "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" + cacheKey;
  script.async = true;
  script.defer = true;
  script.onload = function onApolloLoaded() {
    if (window.trackingFunctions && window.trackingFunctions.onLoad) {
      window.trackingFunctions.onLoad({ appId: "68df55304b6d56001593b9c7" });
    }
  };

  document.head.appendChild(script);
}

initApollo();
