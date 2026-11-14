import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectDiningMeal } from '../src/utils/diningSelection.mjs'

const weekend = {
  brunch: { hour: '10:00 AM - 2:00 PM' },
  dinner: { hour: '5:00 PM - 8:30 PM' }
}
const fridayNight = new Date('2026-10-24T05:00:00Z')

test('Friday breakfast becomes Saturday brunch, even when the hall stays the same', () => {
  assert.equal(selectDiningMeal(weekend, 'breakfast', '2026-10-24', fridayNight), 'brunch')
})

test('preserves a selected meal that exists on the new date', () => {
  assert.equal(selectDiningMeal(weekend, 'dinner', '2026-10-24', fridayNight), 'dinner')
})

test('missing and null menus clear the old meal selection', () => {
  for (const meals of [undefined, null, {}, { breakfast: null }]) {
    assert.equal(selectDiningMeal(meals, 'breakfast', '2026-10-24', fridayNight), '')
  }
})

test('today selects an upcoming meal using campus time, not the viewer timezone', () => {
  assert.equal(selectDiningMeal(weekend, 'breakfast', '2026-10-24', new Date('2026-10-24T22:00:00Z')), 'dinner')
})

test('12 PM is noon, not midnight', () => {
  const meals = { lunch: { hour: '11:00 AM - 12:00 PM' }, dinner: weekend.dinner }
  assert.equal(selectDiningMeal(meals, '', '2026-10-24', new Date('2026-10-24T20:00:00Z')), 'dinner')
})

test('after service hours a published menu remains browsable', () => {
  assert.equal(selectDiningMeal(weekend, '', '2026-10-24', new Date('2026-10-25T06:00:00Z')), 'dinner')
})
