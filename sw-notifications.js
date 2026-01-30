// Service Worker for Launch Playbook Notifications
// Handles background notifications for due dates

const CACHE_NAME = 'playbook-notifications-v1';

// Install event
self.addEventListener('install', function(event) {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Listen for messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    showNotification(event.data);
  }

  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data);
  }
});

// Show a notification
function showNotification(data) {
  const options = {
    body: data.body || 'You have a task due soon.',
    icon: '/images/favicon.png',
    badge: '/images/favicon.png',
    tag: data.tag || 'playbook-notification',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Playbook' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      url: '/launch-playbook.html',
      taskId: data.taskId
    }
  };

  self.registration.showNotification(data.title || 'Task Reminder', options);
}

// Schedule a notification for later
const scheduledNotifications = new Map();

function scheduleNotification(data) {
  const { taskId, title, body, scheduledTime } = data;
  const delay = new Date(scheduledTime).getTime() - Date.now();

  if (delay <= 0) {
    // Due date already passed, show immediately
    showNotification({ title, body, tag: 'task-' + taskId, taskId });
    return;
  }

  // Clear any existing timeout for this task
  if (scheduledNotifications.has(taskId)) {
    clearTimeout(scheduledNotifications.get(taskId));
  }

  // Schedule the notification
  const timeoutId = setTimeout(function() {
    showNotification({ title, body, tag: 'task-' + taskId, taskId });
    scheduledNotifications.delete(taskId);
  }, delay);

  scheduledNotifications.set(taskId, timeoutId);
}

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the playbook page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes('/launch-playbook.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/launch-playbook.html');
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
});

// Periodic sync for checking due dates (if supported)
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-due-dates') {
    event.waitUntil(checkDueDates());
  }
});

async function checkDueDates() {
  // This would typically fetch from IndexedDB or the server
  // For now, we rely on the main page to schedule notifications
  console.log('Periodic sync: checking due dates');
}

// Push notification support (for server-sent notifications)
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      showNotification({
        title: data.title || 'Playbook Update',
        body: data.body || 'Check your launch playbook for updates.',
        tag: data.tag || 'push-notification'
      })
    );
  } catch (e) {
    console.error('Push notification error:', e);
  }
});
