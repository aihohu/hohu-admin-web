import {
  getLayoutAndPage,
  getPathParamFromRoutePath,
  getRoutePathWithParam,
  transformLayoutAndPageToComponent
} from './shared';

/** Derive UI controls only from readable sources; absence stays absent. */
export function menuFormRecord<T extends Partial<Api.SystemManage.Menu>>(record: T) {
  const result = { ...record };
  if (typeof record.component === 'string') {
    const controls = getLayoutAndPage(record.component);
    for (const key of ['layout', 'page'] as const) {
      if (Object.hasOwn(record, key)) Object.assign(result, { [key]: controls[key] });
    }
  }
  if (typeof record.routePath === 'string' && Object.hasOwn(record, 'pathParam')) {
    const { path, param } = getPathParamFromRoutePath(record.routePath);
    Object.assign(result, { routePath: path, pathParam: param });
  }
  return result;
}

/** Unrelated edits must never regenerate routing or empty a collection. */
type MenuDraft = Partial<Api.SystemManage.Menu> & { layout?: string; page?: string; pathParam?: string };
export function menuFormPayload(payload: MenuDraft, model: MenuDraft, creating: boolean): MenuDraft | null {
  const result = { ...payload };
  if (creating || Object.hasOwn(payload, 'layout') || Object.hasOwn(payload, 'page')) {
    if (typeof model.layout !== 'string' || typeof model.page !== 'string' || !Object.hasOwn(model, 'component'))
      return null;
    result.component = transformLayoutAndPageToComponent(model.layout, model.page);
  }
  if (creating || Object.hasOwn(payload, 'routePath') || Object.hasOwn(payload, 'pathParam')) {
    if (typeof model.routePath !== 'string') return null;
    result.routePath = getRoutePathWithParam(getPathParamFromRoutePath(model.routePath).path, model.pathParam ?? '');
  }
  // UI helpers were consumed above; the wire schema accepts these fields too,
  // but they are sent only when actually changed.
  return result;
}
