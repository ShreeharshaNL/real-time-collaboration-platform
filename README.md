# Real-Time Collaboration Platform

[![Live App](https://img.shields.io/badge/Live%20App-collab.shreeharsha.online-blue?style=for-the-badge&logo=cloudflare)](https://collab.shreeharsha.online)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=githubactions)](https://github.com/ShreeharshaNL/real-time-collaboration-platform)
[![Stack](https://img.shields.io/badge/Stack-MERN%20%7C%20Redis%20%7C%20Socket.IO-purple?style=for-the-badge)](#tech-stack)

A full-stack, enterprise real-time collaboration application featuring live team messaging, active user presence tracking, shared Kanban task boards with instant synchronization, role-based workspaces, and horizontal scalability via Redis Pub/Sub WebSocket clustering.

Deployed live on Cloudflare Edge with Cloudflare D1 SQL at **[https://collab.shreeharsha.online](https://collab.shreeharsha.online)**.

## Architecture & Scalability

```mermaid
graph TD
    Client1[Client A (Browser)] <-->|WebSocket / HTTP| Edge[Cloudflare Edge / Nginx]
    Client2[Client B (Browser)] <-->|WebSocket / HTTP| Edge

    subgraph Scaled Node.js Cluster
        Edge <--> Server1[Node.js Server Instance 1]
        Edge <--> Server2[Node.js Server Instance 2]
    end

    subgraph Synchronization & State
        Server1 <-->|Pub/Sub Adapter| Redis[(Redis Pub/Sub Channel)]
        Server2 <-->|Pub/Sub Adapter| Redis
    end

    subgraph Persistent Storage
        Server1 --> DB[(MongoDB / Cloudflare D1)]
        Server2 --> DB
    end
```

### Key Technical Highlights
- **Horizontal Scaling via Redis Pub/Sub:** Uses `@socket.io/redis-adapter` so users connected to different Node.js servers in a cluster receive instant board updates and chat messages with sub-10ms broadcast latency.
- **Role-Based Workspaces (RBAC):** Hierarchical permissions: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
- **Live Presence Engine:** Real-time online/busy/away status heartbeats and dynamic "user is typing" indicators.
- **Kanban Task Boards:** Multi-column task organization (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) with drag-and-drop state syncing.
- **Rate Limiting & Security:** Configurable IP-based rate limiting via `express-rate-limit` protecting against brute-force attacks and socket abuse.
- **Containerized Deployment:** Ready for production with Docker Compose (MongoDB, Redis, Node Backend).

## Getting Started Locally

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### 1. Spin up with Docker Compose
```bash
git clone https://github.com/ShreeharshaNL/real-time-collaboration-platform.git
cd real-time-collaboration-platform

docker compose up --build
```

- Server API: `http://localhost:5000`
- Redis: `localhost:6379`
- MongoDB: `localhost:27017`

### 2. Run Server Manually
```bash
cd server
npm install
npm start
```
