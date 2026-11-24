const maximumCents = 2147483647n;

export function parseCurrency(value) {
  const input = value.trim().replace(/^R\$\s*/, '');
  const brazilian = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
  const decimal = /^\d+\.\d{1,2}$/;
  if (!brazilian.test(input) && !decimal.test(input)) return null;

  const [whole, fractional = ''] = brazilian.test(input)
    ? input.replace(/\./g, '').split(',')
    : input.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, '0'));
  return cents <= maximumCents ? Number(cents) : null;
}

export function formatCurrency(cents) {
  return cents == null ? '' : 'R$ ' + currencyInput(cents);
}

export function currencyInput(cents) {
  const digits = String(cents).padStart(3, '0');
  return digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + digits.slice(-2);
}
