/**
 * Sandbox bootstrap: гарантирует, что у нас есть рабочий sandbox-аккаунт
 * с достаточным балансом для тестового бота.
 *
 * Логика:
 *   1) GetSandboxAccounts → берём первый или открываем новый.
 *   2) GetSandboxPortfolio → если RUB < min, делаем SandboxPayIn до целевой суммы.
 *
 * Использует команды из @ttech-pub/invest-sdk-node (P6.1, переиспользуемые).
 */

import {
  InvestNodeSDK,
  GetSandboxAccountsCommand,
  OpenSandboxAccountCommand,
  GetSandboxPortfolioCommand,
  SandboxPayInCommand,
} from '@ttech-pub/invest-sdk-node';

export interface BootstrappedSandbox {
  accountId: string;
  /** Текущий баланс RUB после bootstrap (units). */
  rubBalance: number;
  /** Был ли аккаунт создан в этом запуске. */
  created: boolean;
  /** Сколько было пополнено в этом запуске (RUB units). */
  paidIn: number;
}

export interface BootstrapOptions {
  /** Имя для нового аккаунта, если пришлось создавать. */
  accountName?: string;
  /** Минимальный требуемый баланс RUB (units). По умолчанию 50_000. */
  minBalanceRub?: number;
  /** Целевой баланс RUB после pay-in (units). По умолчанию 100_000. */
  targetBalanceRub?: number;
  /**
   * accountId из ENV — если задан, используем его и пропускаем list/open.
   * Это полезно, когда у разработчика уже есть устоявшийся sandbox-аккаунт.
   */
  preferredAccountId?: string;
}

export async function bootstrapSandbox(
  sdk: InvestNodeSDK,
  options: BootstrapOptions = {}
): Promise<BootstrappedSandbox> {
  const minBalance = options.minBalanceRub ?? 50_000;
  const targetBalance = options.targetBalanceRub ?? 100_000;
  const name = options.accountName ?? 'p6-live-bot';

  let accountId = options.preferredAccountId ?? '';
  let created = false;

  if (!accountId) {
    const list = await sdk.send(new GetSandboxAccountsCommand({}));
    if (list.accounts && list.accounts.length > 0) {
      accountId = list.accounts[0].id;
    } else {
      const opened = await sdk.send(new OpenSandboxAccountCommand({ name }));
      accountId = opened.accountId;
      created = true;
    }
  }

  const portfolio = await sdk.send(new GetSandboxPortfolioCommand({ accountId }));
  const rubNow = readRubUnits(portfolio);

  let paidIn = 0;
  if (rubNow < minBalance) {
    const toAdd = targetBalance - rubNow;
    if (toAdd > 0) {
      await sdk.send(
        new SandboxPayInCommand({
          accountId,
          amount: { currency: 'rub', units: toAdd, nano: 0 },
        })
      );
      paidIn = toAdd;
    }
  }

  const finalPortfolio = await sdk.send(new GetSandboxPortfolioCommand({ accountId }));
  const finalRub = readRubUnits(finalPortfolio);

  return { accountId, rubBalance: finalRub, created, paidIn };
}

function readRubUnits(portfolio: {
  totalAmountCurrencies?: { units?: number; currency?: string } | undefined;
}): number {
  const m = portfolio.totalAmountCurrencies;
  if (!m || m.currency !== 'rub') return 0;
  return m.units ?? 0;
}
