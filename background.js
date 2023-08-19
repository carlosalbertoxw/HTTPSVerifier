function showNotification(title, message) {
  const notificationId = `issue-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "images/icon-48.png",
    title: title,
    message: message,
  });
}

function checkLinksHttps(tab) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        function: () => {
          const selector =
            "a[href], img[src], link[href][rel='stylesheet'], script[src]";
          const allLinksHttps = Array.from(
            document.querySelectorAll(selector)
          ).every((element) => {
            const attribute = element.tagName === "IMG" ? "src" : "href";
            const url = element.getAttribute(attribute);
            const isAbsoluteUrl = /^https?:\/\//i.test(url);

            // Returns true if the URL is relative or if it is absolute and starts with "https://"
            return (
              !isAbsoluteUrl || (isAbsoluteUrl && url.startsWith("https://"))
            );
          });
          return allLinksHttps;
        },
      },
      (results) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(results && results[0].result);
      }
    );
  });
}

function checkHttpsPage(tab) {
  return tab.url.startsWith("https://");
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (tab.url.startsWith("http")) {
      const issues = [];

      const checkHttpsPagePromise = new Promise((resolve) => {
        chrome.storage.local.get("enableNotificationsURL", (result) => {
          if (result.enableNotificationsURL !== false && !checkHttpsPage(tab)) {
            resolve("HTTPS is not used.");
          } else {
            resolve(null);
          }
        });
      });

      const checkLinksHttpsPromise = new Promise(async (resolve) => {
        chrome.storage.local.get("enableNotificationsLINKS", async (result) => {
          if (result.enableNotificationsLINKS !== false) {
            const allLinksHttps = await checkLinksHttps(tab);
            if (!allLinksHttps) {
              resolve("Some links do not use HTTPS.");
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });

      const results = await Promise.all([
        checkHttpsPagePromise,
        checkLinksHttpsPromise,
      ]);

      results.forEach((result) => {
        if (result) {
          issues.push(result);
        }
      });

      if (issues.length > 0) {
        showNotification("On the page " + tab.url, issues.join("\n"));
      }
    }
  }
});
