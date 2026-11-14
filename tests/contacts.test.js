import test from 'node:test'
import assert from 'node:assert/strict'
import links, { studentServices } from '../src/utils/links.js'
import { contacts, categories, filterContacts, phoneHref } from '../src/utils/contacts.js'

test('required contacts have unique IDs, verified sources, and expected numbers', () => {
  const expected = {
    police: '805-893-3446', care: '805-893-4613', cso: '805-893-2000',
    'student-health': '805-893-3371', caps: '805-893-4411', 'student-help': '805-893-4357',
    resnet: '805-893-5555', dsp: '805-893-2668', 'financial-aid': '805-893-2432',
    registrar: '805-893-3592', housing: '805-893-2760', parking: '805-893-2346'
  }
  assert.equal(new Set(contacts.map(service => service.id)).size, contacts.length)
  assert.deepEqual(Object.fromEntries(contacts.map(({ id, phone }) => [id, phone])), expected)
  for (const service of contacts) {
    assert.ok(service.name && service.description)
    assert.ok(categories.includes(service.category))
    const source = new URL(service.sourceUrl)
    assert.equal(source.protocol, 'https:')
    assert.ok(source.hostname.endsWith('.ucsb.edu'))
  }
})

test('only campus contacts remain and availability is limited to verified services', () => {
  assert.ok(contacts.every(service => !service.emergency && service.phone !== '911'))
  assert.match(contacts.find(service => service.id === 'police').name, /Non-Emergency/)
  assert.deepEqual(contacts.filter(service => service.availability).map(service => service.id), ['care', 'cso', 'caps'])
  assert.equal(phoneHref('(805) 893-3446'), 'tel:+18058933446')
})

test('search matches names, descriptions, categories, and existing link labels', () => {
  for (const [query, id] of [['dSp', 'dsp'], ['U-Mail', 'student-help'], ['Learning Accommodations', 'dsp'], ['UC Police', 'police']]) {
    assert.ok(filterContacts(studentServices, query).some(service => service.id === id))
  }
  assert.ok(filterContacts(studentServices, 'Technology Support').every(service => service.category === 'Technology Support'))
  assert.equal(filterContacts(studentServices, '   ').length, contacts.length)
  assert.deepEqual(filterContacts(studentServices, 'not-a-real-service'), [])
})

test('phone search tolerates formatting, partial numbers, and country codes', () => {
  for (const query of ['8058934357', '(805) 893-4357', '805.893.4357', '+1 (805) 893-4357', '893 4357']) {
    assert.deepEqual(filterContacts(studentServices, query).map(service => service.id), ['student-help'])
  }
})

test('search and category filters combine and reset without altering data', () => {
  const category = 'Health & Wellness'
  assert.equal(filterContacts(studentServices, '', category).length, 2)
  assert.deepEqual(filterContacts(studentServices, 'counseling', category).map(service => service.id), ['caps'])
  assert.deepEqual(filterContacts(studentServices, 'housing', category), [])
  assert.equal(filterContacts(studentServices).length, 12)
})

test('existing services share directory records and preserve portal links and icons', () => {
  const existing = links.flat().filter(link => link.contactId)
  assert.equal(existing.length, 5)
  assert.equal(links.flat().length, 21)
  assert.deepEqual(links.map(group => group.length), [4, 4, 3, 3, 3, 2, 2])
  assert.ok(links.flat().some(link => link.title === 'BARC' && link.href === 'https://mybarc.ucsb.edu/SIWeb/login.jsp'))
  for (const link of existing) {
    const matches = studentServices.filter(service => service.id === link.contactId)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].link.href, link.href)
    assert.equal(matches[0].link.icon, link.icon)
    assert.equal(matches[0].link.description, link.description)
    assert.equal(matches[0].phone, link.phone)
  }
  const displayedLinks = [...links.flat().filter(link => !link.contactId), ...studentServices.flatMap(service => service.link || [])]
  assert.deepEqual(displayedLinks.map(link => link.href).sort(), links.flat().map(link => link.href).sort())
})


test('category filters contain the twelve essential contacts in the requested groups', () => {
  const expected = {
    'Campus Safety': ['police', 'care', 'cso'],
    'Health & Wellness': ['student-health', 'caps'],
    'Technology Support': ['student-help', 'resnet'],
    'Academic & Financial Support': ['dsp', 'financial-aid', 'registrar'],
    'Campus Services': ['housing', 'parking']
  }
  assert.deepEqual(categories, Object.keys(expected))
  for (const [category, ids] of Object.entries(expected)) {
    assert.deepEqual(filterContacts(studentServices, '', category).map(service => service.id), ids)
  }
  for (const query of ['911', 'BARC Billing', 'Recreation Center', 'Career Services']) {
    assert.deepEqual(filterContacts(studentServices, query), [])
  }
})
