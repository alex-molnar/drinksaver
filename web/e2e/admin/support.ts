import { randomUUID } from 'node:crypto';
import { expect, request as apiFactory, type APIRequestContext, type Page, type Request } from '@playwright/test';

export const apiUrl = process.env.ADMIN_E2E_API_URL ?? 'http://localhost:8080';
const keycloakUrl = 'http://localhost:8081/auth';

export const uniqueName = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

export async function adminApi(page: Page) {
  let authorization = '';
  const capture = (apiRequest: Request) => {
    if (apiRequest.url().startsWith(apiUrl) && apiRequest.url().includes('/v1/admin/')) {
      authorization = apiRequest.headers().authorization ?? authorization;
    }
  };
  page.on('request', capture);
  try {
    await page.goto('/recommendations');
    await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible();
    await expect.poll(() => authorization).toMatch(/^Bearer\s+\S+/);
  } finally {
    page.off('request', capture);
  }
  return apiFactory.newContext({ baseURL: apiUrl, extraHTTPHeaders: { authorization } });
}

export async function consumerApi(request: APIRequestContext) {
  const token = await request.post(`${keycloakUrl}/realms/drinksaver/protocol/openid-connect/token`, {
    form: { grant_type: 'password', client_id: 'drinksaver-frontend', username: 'dev', password: 'dev' },
  });
  expect(token.ok(), 'the local consumer password grant should be available').toBeTruthy();
  const { access_token } = await token.json() as { access_token: string };
  return apiFactory.newContext({ baseURL: apiUrl, extraHTTPHeaders: { authorization: `Bearer ${access_token}` } });
}

export async function deleteFixture(api: APIRequestContext, path: string) {
  const response = await api.delete(path);
  expect(response.ok() || response.status() === 404, `cleanup ${path}: HTTP ${response.status()}`).toBeTruthy();
}

export async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
