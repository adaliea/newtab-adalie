const scenario = new URLSearchParams(location.search).get('scenario') || 'success';
const storage = {};
let bridgeCalls = 0;

if (scenario === 'stale') {
  const timestamp = Date.now() - 5 * 60 * 1000;
  storage.canvasAssignmentsCache = {
    timestamp,
    data: [{
      plannable_type: 'assignment',
      context_name: 'Cached Course',
      plannable: { title: 'Cached assignment', due_at: new Date(Date.now() + 86400000).toISOString() },
      html_url: '/courses/1/assignments/1'
    }]
  };
  storage.canvasAnnouncementsCache = {
    timestamp,
    data: [{
      type: 'Announcement',
      title: 'Cached announcement',
      context_type: 'Course',
      course: { name: 'Cached Course' },
      created_at: new Date().toISOString(),
      html_url: '/courses/1/discussion_topics/1'
    }]
  };
}

globalThis.chrome = {
  tabs: {
    async query() {
      return scenario === 'bridge' ? [{ id: 42 }] : [];
    }
  },
  scripting: {
    async executeScript() {
      bridgeCalls += 1;
      return [{ result: { ok: true, data: [plannerItems(), activityItems()] } }];
    }
  },
  storage: {
    local: {
      async get(key) {
        return { [key]: storage[key] };
      },
      async set(values) {
        Object.assign(storage, values);
      }
    }
  }
};

const requests = [];
globalThis.fetch = async (url, options = {}) => {
  requests.push({
    url: String(url),
    credentials: options.credentials || null,
    authorization: options.headers?.Authorization || null
  });

  if (scenario === 'auth' || scenario === 'bridge') {
    return new Response('<!doctype html><title>Sign in</title>', {
      status: 200,
      headers: { 'content-type': 'text/html' }
    });
  }

  if (scenario === 'stale') {
    return new Response('Unavailable', {
      status: 503,
      headers: { 'content-type': 'text/plain' }
    });
  }

  const body = String(url).includes('/planner/items') ? plannerItems() : activityItems();

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

function plannerItems() {
  return [{
    plannable_type: 'assignment',
    context_name: 'E2E Course',
    plannable: { title: 'Session assignment', due_at: new Date(Date.now() + 86400000).toISOString() },
    html_url: '/courses/1/assignments/2'
  }];
}

function activityItems() {
  return [{
    type: 'Announcement',
    title: 'Session announcement',
    context_type: 'Course',
    course: { name: 'E2E Course' },
    created_at: new Date().toISOString(),
    html_url: '/courses/1/discussion_topics/2'
  }];
}

const { initCanvas } = await import('../js/widgets/canvas.js');

await initCanvas(
  document.getElementById('widget-canvas'),
  document.getElementById('widget-announcements'),
  { canvasUrl: 'https://psu.instructure.com', canvasToken: '' }
);

globalThis.__canvasE2E = { scenario, requests, storage, ready: true };
document.body.dataset.scenario = scenario;
document.body.dataset.requestCredentials = requests.map(request => request.credentials).join(',');
document.body.dataset.authorizationHeaders = requests.map(request => request.authorization || '').join(',');
document.body.dataset.cacheTimestampsMatch = String(
  storage.canvasAssignmentsCache?.timestamp === storage.canvasAnnouncementsCache?.timestamp
);
document.body.dataset.bridgeCalls = String(bridgeCalls);
