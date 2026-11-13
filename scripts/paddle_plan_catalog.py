"""Idempotent Paddle sandbox catalog setup using Python's standard library."""
import argparse
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

parser = argparse.ArgumentParser()
parser.add_argument('--sandbox', action='store_true', required=True)
parser.parse_args()
local = {}
if Path('.dev.vars').exists():
    for line in Path('.dev.vars').read_text(encoding='utf-8').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name, value = line.split('=', 1)
            local[name.strip()] = value.strip().strip('"').strip("'")
key = local.get('PADDLE_SANDBOX_API_KEY') or os.environ.get('PADDLE_SANDBOX_API_KEY', '')
if not key.startswith('pdl_sdbx_apikey_'):
    raise SystemExit('Configure PADDLE_SANDBOX_API_KEY in .dev.vars or the environment.')


def api(path, body=None):
    request = urllib.request.Request('https://sandbox-api.paddle.com' + path,
        data=json.dumps(body).encode() if body else None,
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit('Paddle sandbox HTTP ' + str(error.code) + ' on ' + path) from None


def all_items(resource):
    items, after = [], None
    while True:
        page = api('/' + resource + '?per_page=200' + ('&after=' + after if after else ''))
        items.extend(page['data'])
        if not page['meta']['pagination']['has_more']:
            return items
        after = page['data'][-1]['id']


products, prices, ids = all_items('products'), all_items('prices'), {}
for plan, monthly, yearly in [('pro', 12900, 118800), ('ultra', 24900, 238800)]:
    product = next((p for p in products if (p.get('custom_data') or {}).get('aura_plan') == plan and p['tax_category'] == 'saas'), None)
    if not product:
        product = api('/products', {'name': 'Plano ' + plan.title(), 'tax_category': 'saas',
            'description': 'Atendimento com IA para clínicas de odontologia e estética.',
            'custom_data': {'aura_plan': plan, 'catalog_version': 2}})['data']
    for cycle, amount, interval in [('monthly', monthly, 'month'), ('yearly', yearly, 'year')]:
        price = next((p for p in prices if p['product_id'] == product['id']
            and p['unit_price'] == {'amount': str(amount), 'currency_code': 'BRL'}
            and p.get('billing_cycle') == {'interval': interval, 'frequency': 1}
            and not p.get('trial_period') and p['tax_mode'] == 'internal'
            and p.get('quantity') == {'minimum': 1, 'maximum': 1} and not p.get('unit_price_overrides')), None)
        if not price:
            price = api('/prices', {'product_id': product['id'], 'description': f'Aura {plan} {cycle} BRL v2',
                'name': 'Mensal' if cycle == 'monthly' else 'Anual', 'unit_price': {'amount': str(amount), 'currency_code': 'BRL'},
                'billing_cycle': {'interval': interval, 'frequency': 1}, 'tax_mode': 'internal',
                'quantity': {'minimum': 1, 'maximum': 1}, 'custom_data': {'aura_plan': plan, 'cycle': cycle, 'catalog_version': 2}})['data']
        ids[f'PADDLE_{plan.upper()}_{cycle.upper()}_PRICE_ID'] = price['id']
Path('.wrangler/tmp').mkdir(parents=True, exist_ok=True)
Path('.wrangler/tmp/paddle-plan-catalog.json').write_text(json.dumps(ids, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'environment': 'sandbox', **ids}, indent=2))
