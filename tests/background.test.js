// Loads the real service worker with a fake chrome API and drives it through
// its event listeners.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

const listeners = {};
const event = (name) => ({
  addListener: (listener) => {
    listeners[name] = listener;
  },
});

let state;
function resetState() {
  state = {
    local: { enableNotificationsURL: true, enableNotificationsLINKS: true },
    session: {},
    notifications: [],
    cleared: [],
    injections: 0,
    frames: [],
  };
}
resetState();

// chrome.storage-like get: a key, a list of keys, or an object of defaults.
function storageGet(area, query) {
  if (typeof query === "string") {
    return query in area ? { [query]: area[query] } : {};
  }
  if (Array.isArray(query)) {
    return Object.fromEntries(
      query.filter((key) => key in area).map((key) => [key, area[key]])
    );
  }
  return { ...query, ...area };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

// The only fake call that waits on a timer; everything else resolves in
// microtasks.
let pendingReads = 0;

globalThis.chrome = {
  runtime: { onInstalled: event("onInstalled") },
  tabs: { onRemoved: event("onRemoved"), onUpdated: event("onUpdated") },
  storage: {
    local: {
      get: async (query) => storageGet(state.local, query),
      set: async (values) => Object.assign(state.local, values),
    },
    session: {
      // A read that takes time to come back (value taken before the delay)
      // makes interleaved check-then-set bugs show up.
      get: async (query) => {
        pendingReads++;
        try {
          const value = storageGet(state.session, query);
          await tick();
          return value;
        } finally {
          pendingReads--;
        }
      },
      set: async (values) => Object.assign(state.session, values),
      remove: async (key) => {
        delete state.session[key];
      },
    },
  },
  scripting: {
    executeScript: async () => {
      state.injections++;
      return state.frames;
    },
  },
  notifications: {
    create: (id, options) => state.notifications.push({ id, ...options }),
    clear: (id) => state.cleared.push(id),
  },
  i18n: {
    getMessage: (key, substitutions = []) => [key, ...substitutions].join(" "),
  },
};

await import("../background.js");

beforeEach(resetState);

// Lets the queued notification work finish: waits until no storage read has
// been pending for a few turns of the event loop (each finished read can
// start the next queued task). No fixed delay, so a slow machine cannot make
// the tests fail.
async function settle() {
  for (let idleTurns = 0; idleTurns < 3;) {
    await new Promise((resolve) => setTimeout(resolve, 1));
    idleTurns = pendingReads === 0 ? idleTurns + 1 : 0;
  }
}

function complete(tabId, url) {
  return listeners.onUpdated(tabId, { status: "complete" }, { id: tabId, url });
}

function pageWithInsecureScript(url) {
  return [
    {
      frameId: 0,
      result: {
        documentUrl: url,
        baseUri: url,
        entries: [{ kind: "resources", value: "http://cdn.example.net/a.js" }],
      },
    },
  ];
}

test("install fills in missing settings without overwriting the user's", async () => {
  state.local = { enableNotificationsURL: false };
  await listeners.onInstalled();
  assert.deepEqual(state.local, {
    enableNotificationsURL: false,
    enableNotificationsLINKS: true,
  });
});

test("a URL is notified once per tab, with only the origin in the title", async () => {
  const url = "http://example.com/account?token=abc";
  await complete(1, url);
  await complete(1, url); // reload
  await settle();

  assert.equal(state.notifications.length, 1);
  const [notification] = state.notifications;
  assert.equal(notification.title, "notificationTitle http://example.com");
  assert.doesNotMatch(notification.title, /token/);
  assert.equal(notification.message, "issuePageNotHttps");
});

test("navigating to another URL in the same tab notifies again", async () => {
  await complete(1, "http://example.com/a");
  await settle();
  await complete(1, "http://example.com/b");
  await settle();
  assert.equal(state.notifications.length, 2);
});

test("two 'complete' events at once for the same URL notify once", async () => {
  await Promise.all([
    complete(1, "http://example.com/"),
    complete(1, "http://example.com/"),
  ]);
  await settle();
  assert.equal(state.notifications.length, 1);
});

test("tabs finishing at the same time are all notified", async () => {
  await Promise.all(
    [1, 2, 3].map((tabId) => complete(tabId, "http://example.com/"))
  );
  await settle();
  assert.equal(state.notifications.length, 3);
  assert.deepEqual(Object.keys(state.session).sort(), [
    "lastNotifiedUrl:1",
    "lastNotifiedUrl:2",
    "lastNotifiedUrl:3",
  ]);
});

test("each tab has its own notification, removed when the tab closes", async () => {
  await complete(1, "http://example.com/a");
  await settle();
  await complete(1, "http://example.com/b");
  await complete(2, "http://example.com/a");
  await settle();
  assert.deepEqual(
    state.notifications.map(({ id }) => id),
    ["issue-1", "issue-1", "issue-2"]
  );
  listeners.onRemoved(1);
  await settle();
  assert.deepEqual(state.cleared, ["issue-1"]);
});

test("closing the tab resets the deduplication", async () => {
  await complete(1, "http://example.com/");
  await settle();
  listeners.onRemoved(1);
  await settle();
  assert.deepEqual(state.session, {});
  await complete(1, "http://example.com/");
  await settle();
  assert.equal(state.notifications.length, 2);
});

test("insecure resources are reported on an HTTPS page", async () => {
  const url = "https://example.com/";
  state.frames = pageWithInsecureScript(url);
  await complete(1, url);
  await settle();
  assert.equal(state.injections, 1);
  assert.equal(state.notifications[0].message, "issueMixedResources 1");
});

test("a secure page is not notified", async () => {
  state.frames = [
    {
      frameId: 0,
      result: {
        documentUrl: "https://example.com/",
        baseUri: "https://example.com/",
        entries: [],
      },
    },
  ];
  await complete(1, "https://example.com/");
  await settle();
  assert.equal(state.notifications.length, 0);
});

test("with the resource check disabled nothing is injected", async () => {
  state.local.enableNotificationsLINKS = false;
  await complete(1, "http://example.com/");
  await settle();
  assert.equal(state.injections, 0);
  assert.equal(state.notifications[0].message, "issuePageNotHttps");
});

test("with every notification disabled the page is not inspected", async () => {
  state.local = {
    enableNotificationsURL: false,
    enableNotificationsLINKS: false,
  };
  await complete(1, "http://example.com/");
  await settle();
  assert.equal(state.injections, 0);
  assert.equal(state.notifications.length, 0);
});

test("loading tabs and browser pages are ignored", async () => {
  await listeners.onUpdated(
    1,
    { status: "loading" },
    { id: 1, url: "http://example.com/" }
  );
  await complete(2, "chrome://settings/");
  await settle();
  assert.equal(state.injections, 0);
  assert.equal(state.notifications.length, 0);
});
