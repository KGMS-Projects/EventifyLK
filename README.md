# EventifyLK (EventSphere Engine) 🎪

[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis 7](https://img.shields.io/badge/Cache-Redis%207-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![RabbitMQ](https://img.shields.io/badge/Broker-RabbitMQ%203-FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Enterprise-grade, distributed microservices platform for modern event planning, vendor discovery, equipment rental, and concurrent booking management.**

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Design](#-architecture--design)
- [Tech Stack](#-tech-stack)
- [Microservices & Port Mapping](#-microservices--port-mapping)
- [Database Schema & Integrity](#-database-schema--integrity)
- [Quick Start (Docker Compose)](#-quick-start-docker-compose)
- [Manual Local Development](#-manual-local-development)
- [Environment Variables](#-environment-variables)
- [AWS Cloud Deployment Architecture](#-aws-cloud-deployment-architecture)
- [Contributing & License](#-contributing--license)

---

## 🌟 Overview

**EventifyLK** is a full-stack, distributed event orchestration marketplace. Built on top of the **EventSphere** asynchronous microservices engine, it bridges event organizers with verified service vendors (venues, photographers, caterers, audiovisual suppliers, decorators) while managing end-to-end event execution.

The platform solves real-world logistics challenges:
- **Pessimistic concurrency locking** to eliminate equipment double-booking during peak reservation periods.
- **Dynamic budgeting telemetry** matching projected expenses directly against real-time vendor bookings.
- **Automated financial ledgering** with split-payout calculations, non-refundable deposits, and self-reversing state transitions on cancellation.

---

## ✨ Key Features

### 👤 Identity & Role-Based Security
- Stateless JWT authentication with standard `HS256` signatures and configurable expiration.
- Password salting and hashing powered by `passlib[bcrypt]`.
- Multi-tier Role-Based Access Control (**Customer**, **Vendor**, **Admin**).

### 🏪 Vendor Marketplace & Equipment Rentals
- Business verification lifecycle with admin moderation workflows.
- Rich vendor portfolios, customizable service tier packages, and image galleries.
- **Granular Rental Inventory Tracking**: Tracks unit availability with real-time decrements upon reservation.
- Calendar availability management with conflict prevention.

### 📅 Event Management & Run-of-Show
- Comprehensive event creation: budget caps, guest capacity, venue locations, and privacy modes (`public`, `private`, `unlisted`).
- Automatic SEO-friendly slug generator for public event distribution.
- **Interactive Schedule Builder**: Minute-by-minute timeline orchestrator.
- Real-time event dashboard calculating total booked expenditure versus allocated remaining budget.

### 🔒 Resilient Booking & Payment Engine
- **Zero Race Conditions**: Row-level database pessimistic locks (`SELECT ... FOR UPDATE`) during rental checkout prevent concurrent overselling.
- Transparent financial split: 10% platform commission, 30% initial deposit, and deferred vendor payout balances.
- **Reversible Transactions**: Automatic inventory restocking and calendar unblocking if bookings are cancelled.

---

## 🏛 Architecture & Design

EventifyLK is partitioned into 4 decoupled, independently scalable backend microservices sharing an asynchronous PostgreSQL 16 database tier and Redis caching layer:

```text
                               ┌──────────────────────────┐
                               │   React 19 + Vite SPA    │
                               │   (Port 3000 / Proxy)    │
                               └─────────────┬────────────┘
                                             │
             ┌────────────────┬──────────────┴──────────────┬────────────────┐
             ▼                ▼                             ▼                ▼
     ┌──────────────┐  ┌──────────────┐              ┌──────────────┐  ┌──────────────┐
     │   Identity   │  │    Vendor    │              │    Event     │  │   Booking    │
     │   Service    │  │   Service    │              │   Service    │  │   Service    │
     │ (Port 8001)  │  │ (Port 8002)  │              │ (Port 8003)  │  │ (Port 8004)  │
     └───────┬──────┘  └──────┬───────┘              └──────┬───────┘  └──────┬───────┘
             │                │                             │                 │
             └────────────────┼─────────────────────────────┼─────────────────┘
                              ▼                             ▼
                ┌───────────────────────────┐         ┌───────────┐
                │   PostgreSQL 16 Engine    │         │  Redis 7  │
                │  (Async Connection Pool)  │         │  Caching  │
                └─────────────┬─────────────┘         └───────────┘
                              ▼
                ┌───────────────────────────┐
                │   RabbitMQ Event Broker   │
                └───────────────────────────┘
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React | Single Page Application with glassmorphism CSS tokens and responsive layouts. |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2 | High-performance ASGI microservices with automatic OpenAPI/Swagger docs. |
| **Database** | PostgreSQL 16, SQLAlchemy 2.0 AsyncIO | Normalized relational database using UUID keys and non-blocking `asyncpg`. |
| **Caching** | Redis 7 Alpine | Fast in-memory cache and state manager. |
| **Broker** | RabbitMQ 3 Management | Asynchronous event broker for distributed task handling. |
| **Containerization**| Docker, Docker Compose | Multi-container local orchestration with automated health check dependencies. |

---

## 🔌 Microservices & Port Mapping

| Service | Port | Endpoint Prefix | Interactive API Docs (Swagger) |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | `3000` | `/` | — |
| **Identity Service** | `8001` | `/api/identity` | `http://localhost:8001/docs` |
| **Vendor Service** | `8002` | `/api/vendor` | `http://localhost:8002/docs` |
| **Event Service** | `8003` | `/api/event` | `http://localhost:8003/docs` |
| **Booking Service** | `8004` | `/api/booking` | `http://localhost:8004/docs` |
| **PostgreSQL** | `5432` | — | Internal DB Connection |
| **Redis** | `6379` | — | Internal Cache |
| **RabbitMQ Management**| `15672` | — | `http://localhost:15672` (Web UI) |

---

## 🗄 Database Schema & Integrity

The database is initialized via [`infrastructure/init.sql`](file:///c:/Users/KGMS%20COM/Desktop/eventifyLK/eventifyLK/infrastructure/init.sql) and structured across core domain entities:

- `users`: Credentials, avatar, contact information, and roles (`customer`, `vendor`, `admin`).
- `vendor_profiles`: Business details, verified badges, commission rates, and star ratings.
- `vendor_services` & `vendor_packages`: Granular service pricing and bundle inclusions.
- `rental_inventory`: Hardware/rental items, unit prices, total vs. available quantities.
- `vendor_availability`: Daily calendar state tracking (`available`, `booked`, `blocked`).
- `events` & `event_schedule`: Event metadata, budget constraints, and timeline milestones.
- `bookings` & `booking_items`: Multi-item reservations with itemized billing and vendor allocations.
- `payments`: Transaction ledger tracking deposit, remaining, full, or refunded amounts.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire platform locally is via Docker Compose:

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/eventifyLK.git
cd eventifyLK/eventifyLK
```

### 2. Start All Containers
```bash
docker compose up --build
```

Docker Compose spins up the database, cache, message broker, and backend microservices with automatic health checks:
1. `eventsphere-postgres` initializes schemas from `infrastructure/init.sql`.
2. `eventsphere-redis` and `eventsphere-rabbitmq` boot and pass readiness probes.
3. Backend microservices (`identity`, `vendor`, `event`, `booking`) start up.
4. `eventsphere-frontend` serves the React SPA at **`http://localhost:3000`**.

### 3. Access the Application
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **RabbitMQ Management Portal**: [http://localhost:15672](http://localhost:15672) (User: `eventsphere` / Pass: `eventsphere_dev`)

---

## 🛠 Manual Local Development

If you prefer running services individually without Docker:

### Prerequisites
- **Node.js 18+** and **npm**
- **Python 3.11+**
- Running instances of **PostgreSQL 16** and **Redis 7**

### 1. Setup Backend Services
```bash
# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies for each service (example: Identity Service)
cd services/identity
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
*(Repeat for `services/vendor` on 8002, `services/event` on 8003, and `services/booking` on 8004).*

### 2. Setup Frontend Application
```bash
cd frontend
npm install
npm run dev
```
The Vite development server runs on `http://localhost:3000` and automatically proxies requests starting with `/api/*` to the respective backend microservices.

---

## ⚙ Environment Variables

All microservices inherit standard defaults defined in `services/shared/config.py`. These can be overridden via environment variables or a `.env` file:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://eventsphere:eventsphere_dev@postgres:5432/eventsphere` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis caching instance |
| `RABBITMQ_URL` | `amqp://eventsphere:eventsphere_dev@rabbitmq:5672/` | AMQP RabbitMQ broker string |
| `JWT_SECRET` | `eventsphere-jwt-secret-dev-only` | Secret key for signing authorization tokens |
| `JWT_ALGORITHM` | `HS256` | JWT cryptographic algorithm |
| `JWT_EXPIRATION_MINUTES` | `1440` (24 Hours) | Token lifetime duration |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |

---

## ☁ AWS Cloud Deployment Architecture

For production cloud environments, EventifyLK maps cleanly to AWS native infrastructure:

```text
[ Route 53 (DNS) ] ──> [ CloudFront CDN + ACM (SSL) ] ──> [ S3 Bucket (React SPA) ]
                               │
                               ▼
            [ Application Load Balancer (ALB) ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
 [ AWS ECS Fargate: Public Subnets ]   [ AWS Secrets Manager ]
 (Dockerized FastAPI Microservices)    (JWT Secrets, DB Credentials)
            │
            ├─────────────────────────────────────┐
            ▼                                     ▼
 [ Amazon RDS PostgreSQL (Multi-AZ) ]  [ Amazon ElastiCache (Redis) ]
 (Isolated Private Subnets)            (In-Memory Query Cache)
```

- **Frontend**: Amazon S3 static web hosting fronted by Amazon CloudFront CDN with edge SSL termination.
- **Compute Tier**: AWS ECS (Elastic Container Service) on AWS Fargate executing serverless containers with rolling zero-downtime updates.
- **Routing**: AWS Application Load Balancer (ALB) routing `/api/identity/*`, `/api/vendor/*`, `/api/event/*`, and `/api/booking/*` to target groups with `/health` probes.
- **Data & Caching**: Amazon RDS PostgreSQL (Multi-AZ with automated backups) and Amazon ElastiCache for Redis.
- **Security**: AWS Secrets Manager, IAM Task Execution Roles, and private VPC subnets with Security Group isolation.

---

## 📄 License

This project is licensed under the terms of the [MIT License](file:///c:/Users/KGMS%20COM/Desktop/eventifyLK/eventifyLK/LICENSE).

---

<p align="center">
  Built with ❤️ for Seamless Event Planning & Vendor Management.
</p>
