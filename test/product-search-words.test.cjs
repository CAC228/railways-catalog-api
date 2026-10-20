const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.DOTENV_CONFIG_QUIET = 'true';
const { ProductService } = require('../dist/src/product/product.service');

// Мини-Prisma: применяет к товарам те же условия, что строит buildWhere (AND / OR / contains без учёта регистра).
function matches(product, where) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'AND') return condition.every((part) => matches(product, part));
    if (key === 'OR') return condition.some((part) => matches(product, part));
    if (condition && typeof condition === 'object' && 'contains' in condition) {
      return String(product[key] ?? '').toLowerCase().includes(condition.contains.toLowerCase());
    }
    if (key === 'specs') {
      const { id, value } = condition.some;
      return product.specs.some((spec) => spec.id === id && spec.value === value);
    }
    throw new Error(`условие ${key} в тесте не поддержано`);
  });
}

function setup(products) {
  const calls = [];
  const prisma = {
    product: {
      async findMany({ where }) { calls.push(where); return products.filter((p) => matches(p, where)); },
      async count({ where }) { return products.filter((p) => matches(p, where)).length; },
    },
  };
  return { service: new ProductService(prisma, { async deleteFiles() {} }), calls };
}

const base = { price: null, condition: 'NEW', stock: 1, images: [], analogues: [], description: '', category: null, subcategory: null };
const products = [
  { ...base, id: 'r18', sku: 'TM-0069', slug: 'r18', title: 'Узкоколейные рельсы Р-18', gost: 'ГОСТ 6368-82', descriptionTags: 'р18 p18 релсы', specs: [{ id: 's1', label: 'Состояние', value: 'новые' }] },
  { ...base, id: 'klemma', sku: 'TM-0500', slug: 'klemma', title: 'Клемма ЖБР-65', gost: '', descriptionTags: 'клема клемы', specs: [] },
  { ...base, id: 'petushok', sku: 'TM-0783', slug: 'petushok', title: 'Петушок для рельсов Р18, Р24', gost: '', descriptionTags: null, specs: [{ id: 's1', label: 'Состояние', value: 'старые' }] },
];
const query = (search, extra = {}) => ({ search, skip: 0, take: 20, page: 1, limit: 20, ...extra });
const found = async (search, attributes) => {
  const { service } = setup(products);
  return (await service.findAll(query(search), attributes)).items.map((p) => p.id).sort();
};

test('слова запроса ищутся по отдельности: одно в названии, другое в словах для поиска', async () => {
  assert.deepEqual(await found('рельс р18'), ['petushok', 'r18']);
  assert.deepEqual(await found('р18 рельсы узкоколейные'), ['r18']);
  assert.deepEqual(await found('  Релсы   Р18 '), ['r18']);
});

test('ошибка в слове находит товар через слова для поиска', async () => {
  assert.deepEqual(await found('клема'), ['klemma']);
  assert.deepEqual(await found('клемма'), ['klemma']);
});

test('каждое слово обязательно: лишнее слово, которого нигде нет, отсекает товар', async () => {
  assert.deepEqual(await found('рельс р18 шпала'), []);
});

test('пустой запрос не фильтрует, поиск складывается с фильтром по характеристике', async () => {
  assert.deepEqual(await found('   '), ['klemma', 'petushok', 'r18']);
  assert.deepEqual(await found('р18', { s1: 'новые' }), ['r18']);
});
