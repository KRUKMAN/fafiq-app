# FAFIQ / RescueOps — System Context (Authoritative)

**Version:** v0.2  
**Last updated:** 2025-12-17  

This document is the single source of truth for AI-assisted coding and design decisions for the FAFIQ / RescueOps project.  
Any AI agent or developer must treat this file as authoritative context.

---

## 1. Product Scope (MVP Constraints)

- Single source of truth per dog
- Reduce coordination overhead
- Replace chats, spreadsheets, and ad-hoc tools
- Modern, fast, low-friction UX

Explicit non-goals (MVP):
- Public portals
- Heavy automation engines
- Enterprise BI
- Cross-NGO pooling

---

## 2. Users, Identity & Roles

### 2.1 Identity Model
- `auth.users` → authentication
- `profiles` → personal info
- No global role on profile

### 2.2 Membership Model
- `memberships` join table:
  - `user_id`
  - `org_id` (tenant identifier)
  - `roles[]`

A single person:
- Can belong to multiple orgs
- Can hold multiple roles per org

### 2.3 Roles (MVP)
- Admin / Coordinator
- Volunteer
- Foster
- Transport

Future:
- Vet
- Partner NGO
- Adoption candidate

---

## 3. Architecture Overview

**Style:** Modular monolith, SaaS-ready  
**Deployment (MVP):**
- Single-tenant per NGO
- `org_id` present on all business tables
- RLS enabled from day one

**Web-first, mobile-later**

---

## 4. Tech Stack (Locked)

### Frontend
- React Native + Expo
- React Native for Web
- TypeScript (strict)
- NativeWind
- Expo Router

### State Management
- TanStack Query — server state
- Zustand — UI-only state

### Backend
- Supabase
  - Postgres
  - Auth
  - Storage
  - Edge Functions (selective use)

### Validation
- Zod as authoritative domain schema
- Shared across UI, queries, Edge Functions

---

## 5. Core Domain Model

### 5.1 Dog
- id
- org_id
- name
- status / stage (NGO-configurable)
- location
- description
- medical / behavioral notes
- budget tracking
- extra_fields (jsonb)

### 5.2 Transport
- id
- org_id
- from_location
- to_location
- assigned_membership_id
- status

Transport is a **task**, not a person.

---

## 6. Customization Rules
- NGO-defined stages/statuses
- Shared core schema
- Custom data via `jsonb`
- No per-tenant schema forks

---

## 7. Activity Logging / Audit Trail (Required)

### 7.1 Principles
- Append-only
- Tenant-scoped
- RLS-protected
- Structured + human-readable

### 7.2 Logged Events (Minimum)
- Dog status/stage changes
- Assignment changes (owner, foster, transport)
- Medical events
- Transport lifecycle
- Document uploads/changes
- Availability changes
- Role/membership changes

### 7.3 Data Model

**Table: `activity_events`**
- id
- org_id
- created_at
- actor_user_id
- actor_membership_id
- entity_type
- entity_id
- event_type
- summary
- payload (jsonb)
- related (jsonb)

### 7.4 Rules
Every meaningful mutation must:
1. Perform the write
2. Insert an activity event
3. Invalidate relevant queries

---

## 8. UX & Design Principles
- Notion / Linear-inspired
- No Salesforce density
- Progressive forms
- Clear timelines and history
- Designed for stressed users

---

## 9. Coding Rules (Non-Negotiable)

### MUST
- TypeScript
- Functional components
- TanStack Query for data
- Zod validation
- RLS-aware code
- Always pass `org_id`

### MUST NOT
- Direct DB calls from UI
- Role logic only in frontend
- New frameworks without approval
- Invent requirements

---

## 10. Data Flow Rules
1. UI → hooks
2. hooks → query/mutation
3. Supabase
4. Zod parse
5. UI

Simple CRUD may be client-side.  
Complex logic and system events prefer Edge Functions.

---

## 11. Explicitly Deferred
- Push notifications
- Offline sync
- Automation engine
- Public portals
- Cross-NGO collaboration

---

## 12. Canonical Files That Must Exist
- `project_context.md`
- `docs/schema.md`
- `docs/rls.md`
- `docs/roles.md`
- `docs/storage.md`
- `docs/ai_checklist.md`

---

## 13. Decision Authority
1. This document
2. Latest explicit user instruction
3. AI assumptions lose
