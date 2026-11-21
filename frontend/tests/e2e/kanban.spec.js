import { test, expect } from '@playwright/test';

const user = {
  id: 'user-1',
  fullName: 'Browser Test User',
  email: 'browser@example.test',
  role: 'Member',
  uniqueId: 'TM-BROWSER01',
};
const boardId = '64b000000000000000000001';
const listId = '64b000000000000000000002';
const cardId = '64b000000000000000000003';

async function installApiMocks(page, { authenticated = true } = {}) {
  const state = {
    authenticated,
    boards: [],
    lists: [],
    cards: [],
  };

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const json = body => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/api/auth/login' && method === 'POST') {
      state.authenticated = true;
      return json({ success: true, csrfToken: 'test-csrf-token', user });
    }
    if (path === '/api/auth/me' && method === 'GET') {
      return state.authenticated
        ? json({ success: true, csrfToken: 'test-csrf-token', user })
        : route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Authentication required."}' });
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      state.authenticated = false;
      return json({ success: true });
    }
    if (!state.authenticated) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Authentication required."}' });
    }
    if (path === '/api/kanban/boards' && method === 'GET') {
      return json({ success: true, boards: state.boards });
    }
    if (path === '/api/kanban/boards' && method === 'POST') {
      const body = request.postDataJSON();
      const board = { _id: boardId, title: body.title, description: '', color: '#2563eb' };
      state.boards = [board];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, board }) });
    }
    if (path.endsWith(`/api/kanban/boards/${boardId}/lists`) && method === 'GET') {
      const board = state.boards.find(item => item._id === boardId);
      return json({ success: true, board: { _id: boardId, title: board?.title || 'Project Alpha', description: board?.description || '', color: board?.color || '#2563eb' }, lists: state.lists });
    }
    if (path === `/api/kanban/boards/${boardId}` && method === 'PUT') {
      const body = request.postDataJSON();
      state.boards[0] = { ...state.boards[0], ...body };
      return json({ success: true, board: state.boards[0] });
    }
    if (path === '/api/kanban/lists' && method === 'POST') {
      const body = request.postDataJSON();
      const list = { _id: listId, title: body.title, board: boardId };
      state.lists.push(list);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, list }) });
    }
    if (path === `/api/kanban/lists/${listId}/cards` && method === 'GET') {
      return json({ success: true, cards: state.cards });
    }
    if (path === '/api/kanban/cards' && method === 'POST') {
      const body = request.postDataJSON();
      const card = { _id: cardId, list: listId, title: body.title, priority: 'Medium', checklist: [] };
      state.cards = [card];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, card }) });
    }
    if (path === `/api/kanban/cards/${cardId}` && method === 'PUT') {
      const body = request.postDataJSON();
      state.cards = [{ ...state.cards[0], ...body }];
      return json({ success: true, card: state.cards[0] });
    }
    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Unmocked API route: ${method} ${path}` }),
    });
  });

  return state;
}

test('successful sign-in loads the authenticated board dashboard', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/login');
  await page.getByLabel('Email or unique ID').fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('Member Dashboard | Browser Test User')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Boards' })).toBeVisible();
  await expect(page.getByText('No boards yet. Create your first board above.')).toBeVisible();
});

test('unauthenticated dashboard access redirects to login', async ({ page }) => {
  await installApiMocks(page, { authenticated: false });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('board, list, card and checklist workflows work in the browser', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/login');
  await page.getByLabel('Email or unique ID').fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('heading', { name: 'My Boards' })).toBeVisible();
  await page.getByLabel('New board title').fill('Project Alpha');
  await page.getByRole('button', { name: '+ Create Board' }).click();
  await page.getByRole('button', { name: /Project Alpha/ }).click();

  await expect(page.getByRole('textbox', { name: 'Board title' })).toHaveValue('Project Alpha');
  await page.getByLabel('New list title').fill('To do');
  await page.getByRole('button', { name: '+ Add list' }).click();
  await expect(page.getByLabel('List title To do')).toBeVisible();

  await page.getByLabel('New card in To do').fill('Ship browser tests');
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.getByText('Ship browser tests', { exact: true }).waitFor();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Ship reliable browser tests');
  await page.getByRole('button', { name: '+ Checklist item' }).click();
  await page.getByRole('textbox').filter({ hasValue: '' }).last().fill('Verify CI workflow');
  await page.getByRole('button', { name: 'Save card' }).click();

  await expect(page.getByText('Ship reliable browser tests', { exact: true })).toBeVisible();
  await expect(page.getByText('0/1 checklist items complete')).toBeVisible();
});
