import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { createTestPrisma } from '../src/testDatabase';
import { createApp } from '../src/app';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function bootstrap() {
  const migration = await readFile(new URL('../prisma/migrations/20260910000000_init/migration.sql', import.meta.url), 'utf8');
  const { prisma, connection } = createTestPrisma();
  connection.exec(migration);
  const app = createApp(prisma);
  return { app, prisma, connection };
}

test('health, registration, login, and wallet ledger work', async () => {
  const { app, prisma } = await bootstrap();
  const agent = request(app);

  const health = await agent.get('/api/health').expect(200);
  assert.equal(health.body.status, 'ok');

  const registration = await agent.post('/api/auth/register').send({
    email: 'demo@example.com',
    password: 'password123',
    name: 'Demo User',
  }).expect(201);
  const token = registration.body.accessToken;
  const headers = { authorization: `Bearer ${token}` };

  const wallet = await agent.get('/api/wallet').set(headers).expect(200);
  assert.equal(wallet.body.balance, 0);

  const task = await agent.get('/api/tasks').set(headers).expect(200);
  assert.ok(task.body.items.length >= 1);
  const taskId = task.body.items[0].id;

  await agent.post(`/api/tasks/${taskId}/complete`).set(headers).send({ idempotencyKey: 'same-task' }).expect(200);
  await agent.post(`/api/tasks/${taskId}/complete`).set(headers).send({ idempotencyKey: 'same-task' }).expect(200);
  const ledger = await agent.get('/api/wallet/transactions').set(headers).expect(200);
  assert.equal(ledger.body.items.length, 1);
  assert.equal(ledger.body.items[0].type, 'TASK_REWARD');
  assert.equal(ledger.body.items[0].amount, task.body.items[0].reward);

  const user = await prisma.user.findUnique({ where: { email: 'demo@example.com' } });
  assert.ok(user);
  assert.equal(user.wallet?.balance, task.body.items[0].reward);
});

test('daily reward and mission progress are server controlled', async () => {
  const { app, prisma } = await bootstrap();
  const agent = request(app);
  const registration = await agent.post('/api/auth/register').send({ email: 'mission@example.com', password: 'password123', name: 'Mission User' }).expect(201);
  const headers = { authorization: `Bearer ${registration.body.accessToken}` };
  const missions = await agent.get('/api/missions').set(headers).expect(200);
  const mission = missions.body.items[0];
  const completed = await agent.post(`/api/missions/${mission.id}/complete`).set(headers).send({}).expect(200);
  assert.equal(completed.body.progress, 1);
  const daily = await agent.post('/api/daily-rewards').set(headers).send({}).expect(200);
  assert.equal(daily.body.rewarded, true);
  const streak = await prisma.streak.findUnique({ where: { userId: registration.body.user.id } });
  assert.equal(streak?.count, 1);
});

test('withdrawal requires verification and admin approval', async () => {
  const { app, prisma } = await bootstrap();
  const agent = request(app);
  const registration = await agent.post('/api/auth/register').send({ email: 'withdraw@example.com', password: 'password123', name: 'Withdraw User' }).expect(201);
  const user = registration.body.user;
  const userHeaders = { authorization: `Bearer ${registration.body.accessToken}` };
  await agent.post(`/api/tasks/${'task-demo-1'}/complete`).set(userHeaders).send({ idempotencyKey: 'withdraw-task' }).expect(404);

  const demoTask = await prisma.task.create({ data: { title: 'Demo task', reward: 100, xp: 10, status: 'DEMO', isDemo: true } });
  await agent.post(`/api/tasks/${demoTask.id}/complete`).set(userHeaders).send({ idempotencyKey: 'withdraw-task' }).expect(200);
  await agent.post('/api/withdrawals').set(userHeaders).send({ amount: 50, currency: 'INR', method: 'UPI', recipient: 'demo@upi' }).expect(403);

  const adminRegistration = await agent.post('/api/auth/register').send({ email: 'admin@example.com', password: 'password123', name: 'Admin', role: 'ADMIN' }).expect(201);
  const adminHeaders = { authorization: `Bearer ${adminRegistration.body.accessToken}` };
  const withdrawals = await agent.get('/api/admin/withdrawals').set(adminHeaders).expect(200);
  const withdrawalId = withdrawals.body.items[0].id;
  await agent.post(`/api/admin/withdrawals/${withdrawalId}/approve`).set(adminHeaders).send({}).expect(200);
  await agent.post(`/api/admin/withdrawals/${withdrawalId}/complete`).set(adminHeaders).send({}).expect(200);
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  assert.equal(withdrawal?.status, 'COMPLETED');
});

test('admin routes reject ordinary users', async () => {
  const { app } = await bootstrap();
  const agent = request(app);
  const registration = await agent.post('/api/auth/register').send({ email: 'plain@example.com', password: 'password123', name: 'Plain User' }).expect(201);
  await agent.get('/api/admin/dashboard').set({ authorization: `Bearer ${registration.body.accessToken}` }).expect(403);
});
