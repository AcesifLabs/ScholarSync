# 0004 Notifications poll

The notification bell polls `GET /api/v1/notifications/unread-count` every 60 seconds. SSE or WebSocket push is deferred: polling needs no extra infrastructure, and a one-minute delay is acceptable for group activity.
