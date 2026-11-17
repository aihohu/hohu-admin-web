import { describe, expect, it } from 'vitest';
import { menuFormPayload, menuFormRecord } from '../menu-form-draft';

describe('menu form routing sources', () => {
  it('does not restore hidden helpers from another readable routing field', () => {
    expect(menuFormRecord({ menuId: '1', component: 'layout.base$view.home', routePath: '/home/:id' })).toEqual({
      menuId: '1',
      component: 'layout.base$view.home',
      routePath: '/home/:id'
    });
  });
  it('leaves unrelated routes, queries and buttons untouched', () => {
    expect(menuFormPayload({ menuName: 'Changed' }, { component: 'view.home', buttons: [], query: [] }, false)).toEqual(
      { menuName: 'Changed' }
    );
  });
  it('refuses routing regeneration without a complete readable source', () => {
    expect(menuFormPayload({ layout: 'blank' }, { layout: 'blank' }, false)).toBeNull();
    expect(menuFormPayload({ pathParam: 'id' }, { pathParam: 'id' }, false)).toBeNull();
  });
  it('derives complete routes only when the corresponding input changes', () => {
    expect(menuFormPayload({ page: 'user' }, { layout: 'base', page: 'user', component: 'view.home' }, false)).toEqual({
      page: 'user',
      component: 'layout.base$view.user'
    });
    expect(menuFormPayload({ pathParam: 'new' }, { routePath: '/home/:old', pathParam: 'new' }, false)).toEqual({
      pathParam: 'new',
      routePath: '/home/:new'
    });
  });
});
