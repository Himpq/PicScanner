<script setup>
import { ref, onMounted } from 'vue';
import { call } from '../bridge.js';
import { useMapStore } from '../stores/map.js';
import { probeTile, resetTianditu } from '../map/tianditu.js';
import SettingsSwitch from './SettingsSwitch.vue';

// 地图分页：天地图双 key + 位置信息补扫。
// 密钥只存本机 data/module_configs/map_service.json，不会上传。
//
// 天地图浏览器端 / 服务端是两种 key，权限不互通：
// - 浏览器端：JSAPI + 瓦片（地图显示用），必填；
// - 服务端：地理编码等接口探测用，可选（地图显示不需要它）。

const store = useMapStore();
const tkInput = ref('');
const serverInput = ref('');
const versionInput = ref('4.0');
const showTk = ref(false);
const showServerTk = ref(false);
const saving = ref(false);
const testing = ref(false);
const status = ref('');
const statusKind = ref(''); // '' | 'ok' | 'error'
const tileResult = ref(null); // { ok: true|false|null, text }
const geoResult = ref(null);

const backfilling = ref(false);
const backfillStatus = ref('');
let backfillCancelled = false;

function setStatus(text, kind = '') {
  status.value = text;
  statusKind.value = kind;
}

onMounted(async () => {
  await store.load(true);
  tkInput.value = store.tk;
  serverInput.value = store.serverTk;
  versionInput.value = store.apiVersion;
});

async function save() {
  if (saving.value) return;
  saving.value = true;
  setStatus('保存中…');
  try {
    store.tk = String(tkInput.value || '').trim();
    store.serverTk = String(serverInput.value || '').trim();
    store.apiVersion = String(versionInput.value || '').trim() || '4.0';
    await store.persist();
    resetTianditu();
    setStatus('已保存', 'ok');
    if (window.PS && window.PS.showToast) window.PS.showToast('地图设置已保存');
  } catch (err) {
    setStatus(String((err && err.message) || err), 'error');
    if (window.PS && window.PS.showToast) window.PS.showToast('地图设置保存失败', 'error');
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  if (testing.value) return;
  testing.value = true;
  tileResult.value = { ok: null, text: '瓦片探测中…' };
  geoResult.value = null;
  try {
    const tile = await probeTile({ tk: tkInput.value });
    tileResult.value = { ok: !!tile.success, text: String(tile.message || '') };
  } catch (err) {
    tileResult.value = { ok: false, text: String((err && err.message) || err) };
  }
  const serverProbe = String(serverInput.value || '').trim();
  if (!serverProbe && !store.serverTk) {
    geoResult.value = { ok: null, text: '未配置服务端密钥，已跳过（地图显示不需要它）' };
  } else {
    geoResult.value = { ok: null, text: '地理编码探测中…' };
    try {
      const res = await store.testGeocode(serverInput.value);
      if (res && res.success) {
        geoResult.value = {
          ok: true,
          text: (res.message || '连接正常') + (res.latency_ms ? ' · ' + res.latency_ms + 'ms' : ''),
        };
      } else {
        geoResult.value = { ok: false, text: (res && res.message) || '连接失败' };
      }
    } catch (err) {
      geoResult.value = { ok: false, text: String((err && err.message) || err) };
    }
  }
  testing.value = false;
}

function onShowInInfoPanel(value) {
  store.setShowInInfoPanel(value === true);
}

function openKeyConsole() {
  call('open_external_url', 'https://console.tianditu.gov.cn/api/key').catch(() => {});
}

async function startBackfill() {
  if (backfilling.value) return;
  backfilling.value = true;
  backfillCancelled = false;
  let afterId = 0;
  let totalScanned = 0;
  let totalUpdated = 0;
  backfillStatus.value = '开始补扫…';
  try {
    for (;;) {
      if (backfillCancelled) {
        backfillStatus.value = `已取消（已扫描 ${totalScanned}，补回 ${totalUpdated}）`;
        break;
      }
      const res = await store.backfill(afterId, 500);
      if (!res || !res.success) throw new Error((res && res.message) || '补扫失败');
      totalScanned += Number(res.scanned || 0);
      totalUpdated += Number(res.updated || 0);
      afterId = Number(res.next_after_id || 0);
      if (res.done) {
        backfillStatus.value = `补扫完成：扫描 ${totalScanned} 张，补回 ${totalUpdated} 张位置`;
        break;
      }
      backfillStatus.value = `补扫中…已扫描 ${totalScanned}，补回 ${totalUpdated}`
        + (Number(res.remaining) > 0 ? `，剩余约 ${res.remaining}` : '');
      if (!afterId) break;
    }
  } catch (err) {
    backfillStatus.value = String((err && err.message) || err);
  } finally {
    backfilling.value = false;
  }
}

function cancelBackfill() {
  backfillCancelled = true;
}
</script>

<template>
  <div class="settings-stack">
    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>天地图</h3>
          <p>照片参数面板底部的拍摄位置小地图</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <SettingsSwitch
          title="在照片参数面板显示拍摄位置小地图"
          :modelValue="store.showInInfoPanel"
          @update:modelValue="onShowInInfoPanel"
        />

        <div class="settings-row-item settings-row-stacked">
          <div>
            <strong>浏览器端密钥</strong>
            <small>地图显示用，必填。天地图控制台应用类型选「浏览器端」</small>
          </div>
          <div class="settings-map-key-row">
            <input
              class="settings-text-input"
              :type="showTk ? 'text' : 'password'"
              spellcheck="false"
              autocomplete="off"
              placeholder="粘贴浏览器端 tk"
              v-model="tkInput"
              @keydown.enter.prevent="save"
            />
            <button type="button" class="ghost-btn" @click="showTk = !showTk">{{ showTk ? '隐藏' : '显示' }}</button>
          </div>
        </div>

        <div class="settings-row-item settings-row-stacked">
          <div>
            <strong>服务端密钥（可选）</strong>
            <small>仅地理编码探测用，地图显示不需要。天地图控制台应用类型选「服务端」</small>
          </div>
          <div class="settings-map-key-row">
            <input
              class="settings-text-input"
              :type="showServerTk ? 'text' : 'password'"
              spellcheck="false"
              autocomplete="off"
              placeholder="粘贴服务端 tk（可不填）"
              v-model="serverInput"
              @keydown.enter.prevent="save"
            />
            <button type="button" class="ghost-btn" @click="showServerTk = !showServerTk">{{ showServerTk ? '隐藏' : '显示' }}</button>
          </div>
        </div>

        <div class="settings-row-item">
          <div>
            <strong>JSAPI 版本</strong>
            <small>默认 4.0，一般无需修改</small>
          </div>
          <div class="settings-row-controls">
            <input class="settings-text-input settings-text-input-compact" type="text" spellcheck="false" v-model="versionInput" />
          </div>
        </div>

        <div class="settings-inline-tools">
          <button type="button" class="ghost-btn" :disabled="testing" @click="testConnection">{{ testing ? '测试中…' : '测试连接' }}</button>
          <button type="button" class="ghost-btn" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </div>

        <div v-if="tileResult" class="settings-map-status" :class="tileResult.ok === true ? 'ok' : (tileResult.ok === false ? 'error' : '')">
          瓦片：{{ tileResult.text }}
        </div>
        <div v-if="geoResult" class="settings-map-status" :class="geoResult.ok === true ? 'ok' : (geoResult.ok === false ? 'error' : '')">
          接口：{{ geoResult.text }}
        </div>
        <div class="settings-map-status" :class="statusKind" v-if="status">{{ status }}</div>

        <div class="settings-inline-tools">
          <span>还没有密钥？</span>
          <button type="button" class="ghost-btn" @click="openKeyConsole">前往天地图控制台申请</button>
        </div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>位置信息</h3>
          <p>老照片入库时未记录 GPS，可补扫一次</p>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-inline-tools">
          <button type="button" class="ghost-btn" :disabled="backfilling" @click="startBackfill">{{ backfilling ? '补扫中…' : '补扫位置信息' }}</button>
          <button v-if="backfilling" type="button" class="ghost-btn" @click="cancelBackfill">取消</button>
        </div>
        <div class="settings-map-status" v-if="backfillStatus">{{ backfillStatus }}</div>
      </div>
    </section>

    <section class="settings-panel">
      <div class="settings-panel-head">
        <div>
          <h3>说明</h3>
        </div>
      </div>
      <div class="settings-panel-body">
        <div class="settings-row-item" style="display:block;white-space:normal;line-height:1.7;">
          <small style="white-space:normal;">
            底图由天地图提供（© 天地图）。EXIF 中的 GPS 为 WGS-84，天地图使用 CGCS2000，
            两者基本重合，无需坐标纠偏。<br/>
            浏览器端 / 服务端是两种 key：拿浏览器端 key 调服务端接口会 403，反之亦然，
            请按上面的说明分别填写。<br/>
            桌面端 file:// 没有 Referer：如果浏览器端 key 配了域名白名单，瓦片可能被拦，
            建议该 key 不设白名单。<br/>
            修改密钥保存后会立即清掉已加载的 JSAPI，下一次打开照片即用新密钥，无需重启。
          </small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-map-key-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.settings-map-key-row .settings-text-input {
  flex: 1 1 220px;
  min-width: 0;
}
.settings-text-input-compact {
  width: 90px;
}
.settings-map-status {
  margin: 2px 0 4px;
  font-size: 12px;
  color: var(--muted);
}
.settings-map-status.ok { color: #7ddb9a; }
.settings-map-status.error { color: #ff9a9a; }
</style>
