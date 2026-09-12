# Reward App Web Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a complete ₹0-cost GPT Rewards Application using modular monolith architecture with React/Vite frontend, Node.js Express/TypeScript API, PostgreSQL, Docker Compose, and production-ready extension points.

**Architecture:** A modular monolith where Express/TypeScript API serves React SPA, stores financial state in PostgreSQL, and exposes server-authoritative reward, wallet, referral, withdrawal, and audit operations. Frontend uses React Router with mobile-first design. Docker Compose provides PostgreSQL for local development. No paid services required initially.

**Tech Stack:** React 18 + TypeScript + Vite, Node.js + TypeScript + Express.js, PostgreSQL + Prisma ORM, JWT bearer auth, bcrypt, Zod, Helmet, CORS, and Jest/Vitest-style Node tests.

---

## Current State Analysis

### Existing Files (Already scaffolded)

**Backend structure:**
- `backend/package.json` - Basic Express/TypeScript setup with core scripts (dev, build, start, test, typecheck, seed, reset)
- `backend/src/db.ts` - Prisma client setup
- `backend/src/config.ts` - Configuration management
- `backend/src/lib/http-error.ts` - HTTP error handling utilities
- `backend/src/lib/security.ts` - Security utilities (idempotency keys, email normalization)
- `backend/src/lib/auth.ts` - JWT authentication and token utilities
- `backend/src/middleware/auth.ts` - Authentication middleware
- `backend/src/middleware/rateLimit.ts` - Rate limiting middleware
- `backend/src/middleware/audit.ts` - Audit logging middleware
- `backend/src/middleware/admin.ts` - Admin authorization middleware
- `backend/src/modules/auth/authRoutes.ts` - Authentication routes (register, login, refresh, logout, me)
- `backend/src/modules/auth/authService.ts` - Authentication service logic
- `backend/src/modules/demo/demoData.ts` - Demo data for testing
- `backend/src/testDatabase.ts` - Test database setup with pg-mem
- `backend/prisma/schema.prisma` - Core database schema with Users, Sessions, RefreshTokens, Wallets, etc.
- `backend/prisma/migrations/20260910000000_init/migration.sql` - Initial migration

**Workspace structure:**
- Root: `package.json`, `.gitignore`, `docker-compose.yml`, `.env.example`
- `backend/`: Core API with TypeScript config
- `web/`: React frontend (minimal package.json, tsconfig.json)
- `admin/`: React admin dashboard (minimal package.json, tsconfig.json)

### Missing Components (P0 Priority)

**Backend modules not implemented:**
- Wallet service and routes
- Tasks service and routes
- Missions service and routes
- Referrals service and routes
- Fraud service and routes
- Rewards service and routes
- Withdrawals service and routes
- Offers/OfferProvider service and routes
- Admin user management
- Settings management
- Notification system
- Support ticket system
- Campaign system
- Badge system
- Level system
- Leaderboard system
- Streak system

**Missing infrastructure:**
- `backend/src/scripts/seed.ts` - Database seeding script
- `backend/src/scripts/reset.ts` - Database reset script
- `backend/test/api.test.ts` - API tests

**Frontend missing:**
- `web/src/App.tsx` and main entry
- `web/src/components/` - UI components
- `web/src/pages/` - Application pages
- `web/src/lib/api.ts` - API client

**Admin missing:**
- `admin/src/App.tsx` and main entry
- `admin/src/components/` - Admin UI components
- `admin/src/pages/` - Admin pages
- `admin/src/lib/api.ts` - Admin API client

---

## Implementation Strategy

Follow strict TDD approach: write failing tests first, implement minimal code to pass tests, refactor.

### Phase 1: Core Infrastructure (Weeks 1-2)

**Objective:** Set up backend foundation and essential services

#### Task 1.1: Complete Database Schema

**Objective:** Fix and complete Prisma schema with all required models

**Files:**
- Create: `backend/prisma/migrations/20260910000000_init/migration.sql`
- Create: `backend/src/db.ts`
- Modify: `backend/prisma/schema.prisma` - Add missing relations, fix RefreshToken placement

**Step 1:** Fix schema validation errors
```bash
npx prisma validate
```

**Step 2:** Add missing models (Session, RefreshToken, Wallet, WalletTransaction, Task, TaskCompletion, etc.)

**Step 3:** Add relationships and constraints

**Step 4:** Run migration
```bash
npx prisma migrate dev
```

#### Task 1.2: Complete Backend Config

**Objective:** Add required configuration for JWT, environment variables, payment modes

**Files:**
- Create: `backend/src/config.ts` with complete environment setup

**Step 1:** Write failing test for config validation

**Step 2:** Implement config with required variables

**Step 3:** Add environment-specific settings

#### Task 1.3: Setup Test Infrastructure

**Objective:** Create comprehensive test setup

**Files:**
- Create: `backend/src/testDatabase.ts` - Complete test database setup
- Create: `backend/test/api.test.ts` - Core API tests

**Step 1:** Implement test database with pg-mem

**Step 2:** Write tests for authentication endpoints

**Step 3:** Write tests for database operations

#### Task 1.4: Complete Package.json Scripts

**Objective:** Add all required development scripts

**Files:**
- Modify: `backend/package.json` - Complete scripts object

**Step 1:** Add all npm run scripts (dev, build, start, test, typecheck, seed, reset)

**Step 2:** Add dependencies (bcryptjs, jsonwebtoken, zod, helmet, cors, etc.)

### Phase 2: Essential Services (Weeks 3-5)

**Objective:** Implement core business logic modules

#### Task 2.1: Wallet Module

**Objective:** Implement wallet balance management with transaction ledger

**Files:**
- Create: `backend/src/modules/wallet/walletService.ts`
- Create: `backend/src/modules/wallet/walletRoutes.ts`

**Step 1:** Write failing tests for wallet operations (balance check, transactions)

**Step 2:** Implement wallet creation on user registration

**Step 3:** Implement balance queries and transaction history

**Step 4:** Implement credit/debit operations with audit trails

#### Task 2.2: Tasks Module

**Objective:** Implement task completion system with rewards

**Files:**
- Create: `backend/src/modules/tasks/taskService.ts`
- Create: `backend/src/modules/tasks/taskRoutes.ts`

**Step 1:** Write failing tests for task operations (create, complete, rewards)

**Step 2:** Implement task creation and management

**Step 3:** Implement task completion with idempotency

**Step 4:** Implement reward distribution

#### Task 2.3: Authentication Module

**Objective:** Complete authentication with JWT tokens

**Files:**
- Modify: `backend/src/modules/auth/authService.ts` - Complete with session management
- Modify: `backend/src/modules/auth/authRoutes.ts` - Complete all auth endpoints

**Step 1:** Write failing tests for registration, login, token refresh

**Step 2:** Implement registration with email verification

**Step 3:** Implement login with password hashing

**Step 4:** Implement token refresh and logout

### Phase 3: Advanced Features (Weeks 6-8)

**Objective:** Implement referral, mission, and fraud systems

#### Task 3.1: Referral System

**Objective:** Implement multi-level referral tracking with rewards

**Files:**
- Create: `backend/src/modules/referrals/referralService.ts`
- Create: `backend/src/modules/referrals/referralRoutes.ts`

**Step 1:** Write failing tests for referral tracking and rewards

**Step 2:** Implement referral code generation

**Step 3:** Implement referral tracking and qualification

**Step 4:** Implement reward distribution for referrals

#### Task 3.2: Daily Missions

**Objective:** Implement daily missions and streak tracking

**Files:**
- Create: `backend/src/modules/missions/missionService.ts`
- Create: `backend/src/modules/missions/missionRoutes.ts`

**Step 1:** Write failing tests for mission completion and streak tracking

**Step 2:** Implement mission definition and progress tracking

**Step 3:** Implement daily mission reset

**Step 4:** Implement streak management

#### Task 3.3: Fraud Detection

**Objective:** Implement basic fraud detection and risk scoring

**Files:**
- Create: `backend/src/modules/fraud/fraudService.ts`
- Create: `backend/src/modules/fraud/fraudRoutes.ts`

**Step 1:** Write failing tests for fraud detection rules

**Step 2:** Implement risk scoring for suspicious activities

**Step 3:** Implement fraud event logging

### Phase 4: Rewards and Withdrawals (Weeks 9-11)

**Objective:** Implement reward catalog and withdrawal system

#### Task 4.1: Rewards Module

**Objective:** Implement reward catalog and fulfillment system

**Files:**
- Create: `backend/src/modules/rewards/rewardService.ts`
- Create: `backend/src/modules/rewards/rewardRoutes.ts`

**Step 1:** Write failing tests for reward management

**Step 2:** Implement reward creation and catalog

**Step 3:** Implement reward ordering system

**Step 4:** Implement reward fulfillment tracking

#### Task 4.2: Withdrawal System

**Objective:** Implement withdrawal request and processing system

**Files:**
- Create: `backend/src/modules/withdrawals/withdrawalService.ts`
- Create: `backend/src/modules/withdrawals/withdrawalRoutes.ts`

**Step 1:** Write failing tests for withdrawal workflow

**Step 2:** Implement withdrawal request submission

**Step 3:** Implement admin approval workflow

**Step 4:** Implement payout processing

### Phase 5: Admin Dashboard (Weeks 12-14)

**Objective:** Build admin interface and management capabilities

#### Task 5.1: Admin Backend

**Files:**
- Create: `backend/src/modules/admin/adminRoutes.ts`
- Create: `backend/src/modules/admin/adminService.ts`

**Step 1:** Write failing tests for admin operations

**Step 2:** Implement user management

**Step 3:** Implement task management

**Step 4:** Implement withdrawal approval

#### Task 5.2: Admin Frontend

**Files:**
- Create: `admin/src/App.tsx` and main entry
- Create: `admin/src/components/` - Admin UI components
- Create: `admin/src/pages/` - Admin pages
- Create: `admin/src/lib/api.ts` - Admin API client

**Step 1:** Set up React admin with routing

**Step 2:** Implement dashboard with metrics

**Step 3:** Implement user management interface

**Step 4:** Implement task management interface

### Phase 6: Frontend Implementation (Weeks 15-17)

**Objective:** Build user-facing web interface

#### Task 6.1: Web Frontend

**Files:**
- Create: `web/src/App.tsx` and main entry
- Create: `web/src/components/` - User UI components
- Create: `web/src/pages/` - User pages
- Create: `web/src/lib/api.ts` - User API client

**Step 1:** Set up React web with responsive design

**Step 2:** Implement home page with balance and activities

**Step 3:** Implement earn page with tasks and offers

**Step 4:** Implement rewards page

**Step 5:** Implement leaderboard and profile pages

### Phase 7: Seed and Demo (Weeks 18-19)

**Objective:** Create seed data and demo environment

#### Task 7.1: Seed Script

**Files:**
- Create: `backend/src/scripts/seed.ts`
- Create: `backend/src/scripts/reset.ts`

**Step 1:** Write seed script for demo data

**Step 2:** Create demo users, tasks, rewards

**Step 3:** Add test scenarios

#### Task 7.2: Demo Mode

**Objective:** Implement demo mode for development

**Files:**
- Modify: `backend/src/config.ts` - Add demo mode configuration
- Modify: `backend/src/app.ts` - Add demo mode middleware

**Step 1:** Implement demo mode toggle

**Step 2:** Add demo login endpoint

**Step 3:** Mark all rewards as demo

### Phase 8: DevOps and Documentation (Weeks 20-22)

**Objective:** Complete DevOps setup and documentation

#### Task 8.1: Docker Compose

**Files:**
- Modify: `docker-compose.yml` - Complete production setup

**Step 1:** Add PostgreSQL service with health checks

**Step 2:** Add admin and backend services

**Step 3:** Add environment configuration

#### Task 8.2: Environment Setup

**Files:**
- Create: `.env.example` - Complete environment variables
- Create: `.gitignore` - Exclude sensitive files

**Step 1:** Add all required environment variables

**Step 2:** Document configuration for development and production

#### Task 8.3: Documentation

**Files:**
- Create: `README.md` - Project documentation
- Create: `docs/architecture.md` - Architecture documentation
- Create: `SECURITY.md` - Security guidelines
- Create: `CONTRIBUTING.md` - Contribution guidelines

**Step 1:** Write comprehensive README

**Step 2:** Document architecture decisions

**Step 3:** Document security practices

### Phase 9: Testing and Deployment (Weeks 23-24)

**Objective:** Complete testing and deployment setup

#### Task 9.1: Automated Testing

**Step 1:** Run all tests and fix failures

**Step 2:** Add integration tests

**Step 3:** Add end-to-end tests

**Step 4:** Validate Docker deployment

#### Task 9.2: Deployment Validation

**Step 1:** Test local deployment with Docker

**Step 2:** Test admin and web interfaces

**Step 3:** Validate all features work end-to-end

---

## Validation Criteria

### Technical Requirements

- [ ] All tests pass (backend + frontend)
- [ ] Type checking passes (TypeScript)
- [ ] Docker Compose deployment works
- [ ] Database migrations successful
- [ ] Local development setup works
- [ ] Security best practices implemented
- [ ] Performance benchmarks met

### Business Requirements

- [ ] User authentication and registration
- [ ] Wallet balance management with transactions
- [ ] Task completion with rewards
- [ ] Referral system with rewards
- [ ] Daily missions and streak tracking
- [ ] Reward catalog and ordering
- [ ] Withdrawal request and approval workflow
- [ ] Admin dashboard with full CRUD
- [ ] Fraud detection and risk scoring
- [ ] Audit logging for all actions
- [ ] Demo mode for development

### Quality Requirements

- [ ] Code coverage > 80%
- [ ] All code follows TypeScript best practices
- [ ] API documentation generated
- [ ] Error handling and validation
- [ ] Input sanitization and security
- [ ] Performance monitoring ready

---

## Risks and Mitigation

### Technical Risks

1. **Database Schema Complexity** - Mitigate with incremental changes and testing
2. **Authentication Security** - Mitigate with regular security reviews
3. **Performance Issues** - Mitigate with optimization and load testing
4. **Feature Creep** - Mitigate with strict P0 vs P1 prioritization

### Timeline Risks

1. **Module Dependencies** - Mitigate with interface-based design
2. **Testing Coverage** - Mitigate with TDD throughout development
3. **Integration Issues** - Mitigate with integration tests at each phase

---

## Success Metrics

- **Development Speed**: Complete MVP in 24 weeks with zero-cost tools
- **User Experience**: Mobile-first responsive design
- **Security**: Industry-standard security practices
- **Maintainability**: Clean, modular codebase
- **Scalability**: Architecture supports future paid features

---

## Handoff Plan

After this plan is implemented:

1. **Code Review**: Review all implemented modules
2. **Testing**: Run comprehensive test suite
3. **Documentation**: Complete all documentation
4. **Deployment**: Setup production deployment
5. **Training**: Document usage and maintenance

---

## Next Steps

This plan will be executed using subagent-driven-development with two-stage review:

1. **Spec Compliance Review** after each task
2. **Code Quality Review** after each task is implemented

Only tasks that pass both reviews proceed to implementation.

---

## Emergency Contacts

For blockers during implementation:

- **Architecture Issues**: Review with senior engineer
- **Security Concerns**: Contact security team
- **Performance Issues**: Contact performance team
- **Deadline Concerns**: Escalate to project manager

---

**Plan Status**: Ready for implementation
**Complexity**: High - 500+ tasks across 9 phases
**Risk Level**: Medium - Well-defined scope with clear validation criteria
