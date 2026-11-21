const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const nodemailer = require('nodemailer');
const Otp = require('../models/Otp');
const User = require('../models/User');
const Board = require('../models/Board');

process.env.JWT_SECRET = 'integration-test-jwt-secret-at-least-32-characters';
process.env.OTP_SECRET = 'integration-test-otp-secret-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.COOKIE_SECURE = 'false';
process.env.TRUST_PROXY_HOPS = '0';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_USER = 'integration-test';
process.env.SMTP_PASS = 'integration-test';

const otpByEmail = new Map();
const originalCreateTransport = nodemailer.createTransport;
let failEmailDelivery = false;
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    if (failEmailDelivery) throw new Error('Simulated SMTP delivery failure');
    const code = String(message.text).match(/\b\d{6}\b/)?.[0];
    if (code) otpByEmail.set(String(message.to).toLowerCase(), code);
    return { messageId: 'integration-test' };
  }
});

const { app } = require('../server.cjs');
let replicaSet;
let httpServer;
let baseUrl;

async function request(path, { method = 'GET', body, cookies = '', csrf = '' } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookies) headers.Cookie = cookies;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function cookieHeader(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') || ''];
  return values.filter(Boolean).map((value) => value.split(';')[0]).join('; ');
}

async function createAccount(email, fullName) {
  const sent = await request('/api/auth/send-otp', { method: 'POST', body: { email } });
  assert.equal(sent.status, 202);
  const otp = otpByEmail.get(email);
  assert.match(otp || '', /^\d{6}$/);
  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: { fullName, email, password: 'integration-password-123', otp, role: 'Admin' }
  });
  assert.equal(registered.status, 201);
  const account = await registered.json();
  assert.equal(account.role, 'Member');
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { emailOrId: email, password: 'integration-password-123' }
  });
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.success, true);
  assert.equal(loginBody.token, undefined);
  assert.match(loginBody.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
  return { account, cookies: cookieHeader(login), csrf: loginBody.csrfToken };
}

test('MongoDB replica-set API enforces signup roles, cookie CSRF, board isolation and logout revocation', { timeout: 240000 }, async (t) => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.14' }
  });
  await mongoose.connect(replicaSet.getUri(), { dbName: 'trello-integration' });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  httpServer = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    httpServer.once('listening', resolve);
    httpServer.once('error', reject);
  });
  baseUrl = 'http://127.0.0.1:' + httpServer.address().port;

  await t.test('private Kanban lifecycle and cookie security', async () => {
    const unauthenticated = await request('/api/kanban/boards');
    assert.equal(unauthenticated.status, 401);

    const alice = await createAccount('alice@example.test', 'Alice Example');
    const me = await request('/api/auth/me', { cookies: alice.cookies });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.role, 'Member');

    const noCsrf = await request('/api/kanban/boards', {
      method: 'POST', cookies: alice.cookies, body: { title: 'No CSRF' }
    });
    assert.equal(noCsrf.status, 403);

    const boardResponse = await request('/api/kanban/boards', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf,
      body: { title: 'Alice private board' }
    });
    assert.equal(boardResponse.status, 201);
    const board = (await boardResponse.json()).board;
    const renameBoard = await request('/api/kanban/boards/' + board._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { title: 'Alice planning board', description: 'Quarterly work' }
    });
    assert.equal(renameBoard.status, 200);
    assert.equal((await renameBoard.json()).board.title, 'Alice planning board');
    const emptyBoardTitle = await request('/api/kanban/boards/' + board._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf, body: { title: '   ' }
    });
    assert.equal(emptyBoardTitle.status, 400);

    const listResponse = await request('/api/kanban/lists', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf,
      body: { boardId: board._id, title: 'Backlog' }
    });
    assert.equal(listResponse.status, 201);
    const list = (await listResponse.json()).list;
    const renameList = await request('/api/kanban/lists/' + list._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { title: 'Ready to start' }
    });
    assert.equal(renameList.status, 200);
    assert.equal((await renameList.json()).list.title, 'Ready to start');
    const emptyListTitle = await request('/api/kanban/lists/' + list._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { title: '   ' }
    });
    assert.equal(emptyListTitle.status, 400);

    const cardResponse = await request('/api/kanban/cards', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf,
      body: { listId: list._id, title: 'Private task' }
    });
    assert.equal(cardResponse.status, 201);
    const card = (await cardResponse.json()).card;

    const updateResponse = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { title: 'Renamed task', board: '000000000000000000000001', isArchived: true }
    });
    assert.equal(updateResponse.status, 200);
    const cardsResponse = await request('/api/kanban/lists/' + list._id + '/cards', { cookies: alice.cookies });
    const cards = (await cardsResponse.json()).cards;
    assert.equal(cards.length, 1);
    assert.equal(cards[0].title, 'Renamed task');
    assert.equal(String(cards[0].board), String(board._id));
    assert.equal(cards[0].isArchived, false);

    const secondListResponse = await request('/api/kanban/lists', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf,
      body: { boardId: board._id, title: 'In progress' }
    });
    assert.equal(secondListResponse.status, 201);
    const secondList = (await secondListResponse.json()).list;
    const moveWithinBoard = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { listId: secondList._id }
    });
    assert.equal(moveWithinBoard.status, 200);
    const movedCardsResponse = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: alice.cookies });
    const movedCards = (await movedCardsResponse.json()).cards;
    assert.equal(movedCards.length, 1);
    assert.equal(String(movedCards[0]._id), String(card._id));
    assert.equal(movedCards[0].position, 0);

    const invalidMove = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { listId: 'not-an-object-id' }
    });
    assert.equal(invalidMove.status, 400);

    const invalidDueDate = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { dueDate: 'not-a-date' }
    });
    assert.equal(invalidDueDate.status, 400);
    const saveChecklist = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { checklist: [{ text: 'Review requirements', done: true }, { text: 'Ship safely', done: false }] }
    });
    assert.equal(saveChecklist.status, 200);
    assert.equal((await saveChecklist.json()).card.checklist.length, 2);
    const invalidChecklist = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { checklist: [{ text: '   ', done: 'yes' }] }
    });
    assert.equal(invalidChecklist.status, 400);
    const oversizedChecklist = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { checklist: Array.from({ length: 51 }, (_, index) => ({ text: 'Item ' + index })) }
    });
    assert.equal(oversizedChecklist.status, 400);

    const bob = await createAccount('bob@example.test', 'Bob Example');
    const bobBoards = await request('/api/kanban/boards', { cookies: bob.cookies });
    assert.equal(bobBoards.status, 200);
    assert.deepEqual((await bobBoards.json()).boards, []);
    const forbiddenBoardRename = await request('/api/kanban/boards/' + board._id, {
      method: 'PUT', cookies: bob.cookies, csrf: bob.csrf, body: { title: 'Hijacked board' }
    });
    assert.equal(forbiddenBoardRename.status, 404);
    const forbiddenListRename = await request('/api/kanban/lists/' + list._id, {
      method: 'PUT', cookies: bob.cookies, csrf: bob.csrf, body: { title: 'Hijacked list' }
    });
    assert.equal(forbiddenListRename.status, 404);
    const forbiddenList = await request('/api/kanban/boards/' + board._id + '/lists', { cookies: bob.cookies });
    assert.equal(forbiddenList.status, 404);
    const forbiddenCards = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: bob.cookies });
    assert.equal(forbiddenCards.status, 404);

    const bobBoardResponse = await request('/api/kanban/boards', {
      method: 'POST', cookies: bob.cookies, csrf: bob.csrf,
      body: { title: 'Bob private board' }
    });
    assert.equal(bobBoardResponse.status, 201);
    const bobBoard = (await bobBoardResponse.json()).board;
    const bobListResponse = await request('/api/kanban/lists', {
      method: 'POST', cookies: bob.cookies, csrf: bob.csrf,
      body: { boardId: bobBoard._id, title: 'Bob list' }
    });
    assert.equal(bobListResponse.status, 201);
    const bobList = (await bobListResponse.json()).list;
    const crossBoardMove = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: alice.cookies, csrf: alice.csrf,
      body: { listId: bobList._id }
    });
    assert.equal(crossBoardMove.status, 400);
    const crossUserCardUpdate = await request('/api/kanban/cards/' + card._id, {
      method: 'PUT', cookies: bob.cookies, csrf: bob.csrf,
      body: { title: 'Unauthorized edit' }
    });
    assert.equal(crossUserCardUpdate.status, 404);
    const crossUserArchive = await request('/api/kanban/cards/' + card._id, {
      method: 'DELETE', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(crossUserArchive.status, 404);
    const forbiddenListArchive = await request('/api/kanban/lists/' + secondList._id, {
      method: 'DELETE', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(forbiddenListArchive.status, 404);
    const forbiddenBoardArchive = await request('/api/kanban/boards/' + board._id, {
      method: 'DELETE', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(forbiddenBoardArchive.status, 404);

    const bobUser = await User.findOne({ email: 'bob@example.test' });
    assert.ok(bobUser);
    await Board.updateOne({ _id: board._id }, { $addToSet: { members: bobUser._id } });

    const sharedBoards = await request('/api/kanban/boards', { cookies: bob.cookies });
    assert.equal((await sharedBoards.json()).boards.some(item => String(item._id) === String(board._id)), true);
    const sharedLists = await request('/api/kanban/boards/' + board._id + '/lists', { cookies: bob.cookies });
    assert.equal(sharedLists.status, 200);
    assert.equal((await sharedLists.json()).lists.some(item => String(item._id) === String(secondList._id)), true);
    const sharedCards = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: bob.cookies });
    assert.equal(sharedCards.status, 200);
    assert.equal((await sharedCards.json()).cards.some(item => String(item._id) === String(card._id)), true);

    const memberBoardRename = await request('/api/kanban/boards/' + board._id, {
      method: 'PUT', cookies: bob.cookies, csrf: bob.csrf, body: { title: 'Shared planning board' }
    });
    assert.equal(memberBoardRename.status, 200);
    const memberBoardArchive = await request('/api/kanban/boards/' + board._id, {
      method: 'DELETE', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(memberBoardArchive.status, 404);

    const archiveCard = await request('/api/kanban/cards/' + card._id, {
      method: 'DELETE', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(archiveCard.status, 200);
    const cardsAfterArchive = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: alice.cookies });
    assert.deepEqual((await cardsAfterArchive.json()).cards, []);
    const archiveList = await request('/api/kanban/lists/' + secondList._id, {
      method: 'DELETE', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(archiveList.status, 200);
    const archivedListAccess = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: alice.cookies });
    assert.equal(archivedListAccess.status, 404);
    const visibleLists = await request('/api/kanban/boards/' + board._id + '/lists', { cookies: alice.cookies });
    assert.equal((await visibleLists.json()).lists.some(item => String(item._id) === String(secondList._id)), false);
    const archiveBoard = await request('/api/kanban/boards/' + board._id, {
      method: 'DELETE', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(archiveBoard.status, 200);
    const visibleBoards = await request('/api/kanban/boards', { cookies: alice.cookies });
    assert.equal((await visibleBoards.json()).boards.some(item => String(item._id) === String(board._id)), false);
    const archiveBin = await request('/api/kanban/archive', { cookies: alice.cookies });
    assert.equal(archiveBin.status, 200);
    const archived = await archiveBin.json();
    assert.equal(archived.boards.some(item => String(item._id) === String(board._id)), true);
    assert.equal(archived.boards.find(item => String(item._id) === String(board._id)).canRestore, true);
    assert.equal(archived.lists.some(item => String(item._id) === String(secondList._id)), true);
    assert.equal(archived.cards.some(item => String(item._id) === String(card._id)), true);
    const bobArchive = await request('/api/kanban/archive', { cookies: bob.cookies });
    const bobArchiveData = await bobArchive.json();
    assert.equal(bobArchiveData.boards.some(item => String(item._id) === String(board._id)), true);
    assert.equal(bobArchiveData.boards.find(item => String(item._id) === String(board._id)).canRestore, false);
    assert.equal(bobArchiveData.lists.some(item => String(item._id) === String(secondList._id)), true);
    assert.equal(bobArchiveData.cards.some(item => String(item._id) === String(card._id)), true);
    const forbiddenRestore = await request('/api/kanban/boards/' + board._id + '/restore', {
      method: 'POST', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(forbiddenRestore.status, 404);

    await Board.updateOne({ _id: board._id }, { $pull: { members: bobUser._id } });
    const revokedBoardLists = await request('/api/kanban/boards/' + board._id + '/lists', { cookies: bob.cookies });
    assert.equal(revokedBoardLists.status, 404);
    const revokedListCards = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: bob.cookies });
    assert.equal(revokedListCards.status, 404);
    const revokedArchive = await request('/api/kanban/archive', { cookies: bob.cookies });
    const revokedArchiveData = await revokedArchive.json();
    assert.equal(revokedArchiveData.boards.some(item => String(item._id) === String(board._id)), false);
    assert.equal(revokedArchiveData.lists.some(item => String(item._id) === String(secondList._id)), false);
    assert.equal(revokedArchiveData.cards.some(item => String(item._id) === String(card._id)), false);
    const revokedRestore = await request('/api/kanban/lists/' + secondList._id + '/restore', {
      method: 'POST', cookies: bob.cookies, csrf: bob.csrf
    });
    assert.equal(revokedRestore.status, 404);

    const restoreCardTooEarly = await request('/api/kanban/cards/' + card._id + '/restore', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(restoreCardTooEarly.status, 404);
    const restoreBoard = await request('/api/kanban/boards/' + board._id + '/restore', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(restoreBoard.status, 200);
    const restoreList = await request('/api/kanban/lists/' + secondList._id + '/restore', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(restoreList.status, 200);
    const restoreCard = await request('/api/kanban/cards/' + card._id + '/restore', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(restoreCard.status, 200);
    const restoredCards = await request('/api/kanban/lists/' + secondList._id + '/cards', { cookies: alice.cookies });
    assert.equal((await restoredCards.json()).cards.some(item => String(item._id) === String(card._id)), true);

    const logout = await request('/api/auth/logout', {
      method: 'POST', cookies: alice.cookies, csrf: alice.csrf
    });
    assert.equal(logout.status, 200);
    const revoked = await request('/api/auth/me', { cookies: alice.cookies });
    assert.equal(revoked.status, 401);
  });

  await t.test('failed email delivery removes the unusable OTP record', async () => {
    const email = 'delivery-failure@example.test';
    failEmailDelivery = true;
    const response = await request('/api/auth/send-otp', { method: 'POST', body: { email } });
    failEmailDelivery = false;
    assert.equal(response.status, 500);
    assert.equal(await Otp.findOne({ email, purpose: 'register' }), null);
  });

  await t.test('OTP verification locks after five invalid attempts', async () => {
    const email = 'charlie@example.test';
    const sent = await request('/api/auth/send-otp', { method: 'POST', body: { email } });
    assert.equal(sent.status, 202);
    const correctOtp = otpByEmail.get(email);
    const wrongOtp = correctOtp === '999999' ? '000000' : '999999';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request('/api/auth/register', {
        method: 'POST',
        body: { fullName: 'Charlie Example', email, password: 'integration-password-123', otp: wrongOtp }
      });
      assert.equal(response.status, 400);
    }
    const locked = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Charlie Example', email, password: 'integration-password-123', otp: correctOtp }
    });
    assert.equal(locked.status, 400);
  });
});

test.after(async () => {
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
  nodemailer.createTransport = originalCreateTransport;
});
