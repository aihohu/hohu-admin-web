import { computed, onScopeDispose, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { FieldPolicyError } from '@/service/api/field-policy-contract';
import type { FieldPolicyRepository } from '@/service/api/field-policy-contract';
import { fingerprint } from './field-policy-rules';

export function useFieldPolicy(options: {
  roleId: Ref<string>;
  identity: Ref<string>;
  repository: FieldPolicyRepository;
}) {
  const { repository: repo } = options;
  const document = shallowRef<Api.FieldManagement.Document | null>(null);
  const catalog = shallowRef<Api.FieldManagement.Catalog | null>(null);
  const manifest = shallowRef<Api.FieldManagement.Manifest | null>(null);
  const objectId = shallowRef('');
  const rules = shallowRef<Api.FieldManagement.Rule[]>([]);
  const reason = shallowRef('');
  const busy = shallowRef(false);
  const reloadRequired = shallowRef(false);
  const unknownRequest = shallowRef('');
  const previewResult = shallowRef<Api.FieldManagement.Preview | null>(null);
  const manifestPreview = shallowRef<Api.FieldManagement.Preview | null>(null);
  const errorCode = shallowRef('');
  const history = shallowRef<Api.FieldManagement.Rule[][]>([]);
  let generation = 0;
  let abort = new AbortController();
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const dirty = computed(() =>
    Boolean(document.value && fingerprint(rules.value) !== fingerprint(document.value.rules))
  );
  const editable = computed(() =>
    Boolean(
      document.value?.capabilities.edit &&
      catalog.value?.complete &&
      !busy.value &&
      !reloadRequired.value &&
      !unknownRequest.value
    )
  );
  const canPublish = computed(() => Boolean(editable.value && previewResult.value && reason.value.trim()));

  function clearPreview() {
    previewResult.value = null;
    manifestPreview.value = null;
    clearTimeout(expiry);
  }
  function reset() {
    generation++;
    abort.abort();
    abort = new AbortController();
    document.value = null;
    catalog.value = null;
    manifest.value = null;
    rules.value = [];
    reason.value = '';
    history.value = [];
    reloadRequired.value = false;
    unknownRequest.value = '';
    errorCode.value = '';
    busy.value = false;
    clearPreview();
  }
  watch([options.roleId, options.identity], reset, { flush: 'sync' });
  onScopeDispose(reset);

  function reject(error: unknown, requestId = '') {
    const known = error instanceof FieldPolicyError ? error : new FieldPolicyError('FIELD_POLICY_UNAVAILABLE');
    errorCode.value = known.code;
    clearPreview();
    if (
      requestId &&
      (known.status === 0 || ['AUTHORIZATION_COMMIT_UNKNOWN', 'AUTHORIZATION_ROLLBACK_UNKNOWN'].includes(known.code))
    )
      unknownRequest.value = requestId;
    else reloadRequired.value = true;
  }

  async function load(selected = objectId.value) {
    if (!options.roleId.value || !options.identity.value || unknownRequest.value) return;
    reset();
    const current = generation;
    const role = options.roleId.value;
    busy.value = true;
    try {
      let page = await repo.catalog('0', abort.signal);
      const objects = [...page.objects];
      let count = 1;
      while (page.nextCursor) {
        if (current !== generation) return;
        if (++count > 64) throw new FieldPolicyError('FIELD_POLICY_CATALOG_CONFLICT', 409);
        const next = await repo.catalog(page.nextCursor, abort.signal);
        if (
          next.catalogDigest !== page.catalogDigest ||
          next.tenantId !== page.tenantId ||
          next.headVersion !== page.headVersion
        )
          throw new FieldPolicyError('FIELD_POLICY_CATALOG_CONFLICT', 409);
        page = next;
        objects.push(...page.objects);
      }
      if (current !== generation) return;
      if (!page.complete || !objects.length) throw new FieldPolicyError('FIELD_POLICY_UNAVAILABLE', 503);
      objectId.value = objects.some(o => o.objectId === selected) ? selected : objects[0].objectId;
      const value = await repo.object(role, objectId.value, abort.signal);
      const state = await repo.manifest(abort.signal);
      if (current !== generation) return;
      if (
        value.catalogDigest !== page.catalogDigest ||
        value.headVersion !== page.headVersion ||
        value.epoch !== page.epoch ||
        state.tenantId !== value.tenantId ||
        state.catalogDigest !== value.catalogDigest ||
        state.epoch !== value.epoch ||
        state.headVersion !== value.headVersion ||
        value.tenantId !== page.tenantId
      )
        throw new FieldPolicyError('FIELD_POLICY_VERSION_CONFLICT', 409);
      catalog.value = { ...page, objects };
      document.value = value;
      rules.value = structuredClone(value.rules);
      manifest.value = state;
    } catch (error) {
      if (current === generation) reject(error);
    } finally {
      if (current === generation) busy.value = false;
    }
  }

  function setRules(value: Api.FieldManagement.Rule[]) {
    if (!editable.value || fingerprint(value) === fingerprint(rules.value)) return;
    history.value = [...history.value.slice(-9), rules.value];
    rules.value = structuredClone(value);
    clearPreview();
  }
  function undo() {
    if (!editable.value || !history.value.length) return;
    rules.value = history.value[history.value.length - 1];
    history.value = history.value.slice(0, -1);
    clearPreview();
  }
  function draft(): Api.FieldManagement.Draft {
    const value = document.value!;
    return {
      catalogDigest: value.catalogDigest,
      expectedVersion: value.headVersion,
      expectedBindingVersion: value.bindingVersion,
      rules: rules.value
    };
  }
  async function preview() {
    if (!document.value || busy.value || reloadRequired.value || unknownRequest.value) return;
    const current = generation;
    busy.value = true;
    try {
      const result = await repo.preview(options.roleId.value, objectId.value, draft(), abort.signal);
      if (current !== generation) return;
      previewResult.value = result;
      expiry = setTimeout(clearPreview, Math.max(0, Date.parse(result.expiresAt) - Date.now()));
    } catch (error) {
      if (current === generation) reject(error);
    } finally {
      if (current === generation) busy.value = false;
    }
  }
  async function mutate(action: (requestId: string) => Promise<Api.FieldManagement.Receipt>) {
    const current = generation;
    const requestId = crypto.randomUUID();
    busy.value = true;
    try {
      await action(requestId);
      if (current !== generation) return false;
      await load();
      return true;
    } catch (error) {
      if (current === generation) reject(error, requestId);
      return false;
    } finally {
      if (current === generation) busy.value = false;
    }
  }
  async function publish() {
    const value = previewResult.value;
    if (!canPublish.value || !value || Date.parse(value.expiresAt) <= Date.now()) {
      clearPreview();
      return false;
    }
    return mutate(requestId =>
      repo.publish(options.roleId.value, objectId.value, {
        ...draft(),
        previewDigest: value.previewDigest,
        reason: reason.value,
        requestId
      })
    );
  }
  async function reviewManifest() {
    if (!editable.value || dirty.value || !manifest.value) return;
    const current = generation;
    busy.value = true;
    try {
      const result = await repo.previewManifest({
        expectedVersion: manifest.value.headVersion,
        catalogDigest: manifest.value.catalogDigest
      });
      if (current === generation) manifestPreview.value = result;
    } catch (error) {
      if (current === generation) reject(error);
    } finally {
      if (current === generation) busy.value = false;
    }
  }
  async function buildManifest() {
    const value = manifestPreview.value;
    if (!editable.value || dirty.value || !reason.value.trim() || !value || Date.parse(value.expiresAt) <= Date.now())
      return false;
    return mutate(requestId =>
      repo.build({
        expectedVersion: value.headVersion,
        catalogDigest: value.catalogDigest,
        previewDigest: value.previewDigest,
        reason: reason.value,
        requestId
      })
    );
  }
  async function freeze() {
    const value = document.value;
    if (
      !value?.capabilities.freeze ||
      busy.value ||
      reloadRequired.value ||
      unknownRequest.value ||
      !reason.value.trim()
    )
      return false;
    return mutate(requestId =>
      repo.freeze({
        expectedVersion: value.headVersion,
        expectedEpoch: value.epoch,
        objectId: objectId.value,
        reason: reason.value,
        requestId
      })
    );
  }
  async function checkReceipt() {
    if (!unknownRequest.value || busy.value) return;
    const current = generation;
    busy.value = true;
    try {
      const result = await repo.receipt(unknownRequest.value);
      if (current === generation && result) {
        unknownRequest.value = '';
        await load();
      }
    } catch {
      /* An unavailable fact remains unknown; never execute the mutation again. */
    } finally {
      if (current === generation) busy.value = false;
    }
  }
  return {
    document,
    catalog,
    manifest,
    objectId,
    rules,
    reason,
    busy,
    dirty,
    editable,
    reloadRequired,
    unknownRequest,
    previewResult,
    manifestPreview,
    errorCode,
    history,
    canPublish,
    reset,
    load,
    setRules,
    undo,
    preview,
    publish,
    reviewManifest,
    buildManifest,
    freeze,
    checkReceipt
  };
}
