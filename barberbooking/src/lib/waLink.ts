export function fillTemplate(template: string, vars: { name: string; service: string; date: string; time: string; price: number }): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{service\}\}/g, vars.service)
    .replace(/\{\{date\}\}/g, vars.date)
    .replace(/\{\{time\}\}/g, vars.time)
    .replace(/\{\{price\}\}/g, String(vars.price));
}

export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
