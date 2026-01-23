<template>
  <div class="report-container">
    <!-- サマリー：ユーザー名など（左寄せのまま） -->
    <div class="summary-card">
      <table class="summary-table" role="table" aria-label="勤務実績サマリー">
        <tbody>
          <tr>
            <th scope="row">ユーザー名</th>
            <td>{{ displayUsername }}</td>
          </tr>
          <tr>
            <th scope="row">勤務時間合計</th>
            <td>{{ totalWorkTime }}</td>
          </tr>
          <tr>
            <th scope="row">休暇日数</th>
            <td>5/20</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="main-content">
      <!-- ✅ 中央寄せの基準を統一：月切替 + テーブルを同じ縮小コンテナに入れる -->
      <div class="center-area">
        <div class="scaled-area">
          <!-- 月切替 -->
          <div class="month-selector">
            <button class="nav-btn" @click="prevMonth">←</button>
            <span>{{ year }}年{{ month }}月</span>
            <button class="nav-btn" @click="nextMonth">→</button>
          </div>

          <LoadingSpinner v-if="isLoading" />

          <!-- テーブル -->
          <div v-else class="table-scroll">
            <div class="table-frame">
              <table class="record-table" role="table" aria-label="勤務実績テーブル">
                <thead>
                  <tr>
                    <th scope="col">状態</th>
                    <th scope="col">日付</th>
                    <th scope="col">曜日</th>
                    <th scope="col">出勤</th>
                    <th scope="col">退勤</th>
                    <th scope="col">勤務時間</th>
                    <th scope="col">作業内容</th>
                    <th scope="col">操作</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="entry in records"
                    :key="entry.fullDate"
                    :class="getStatusClass(entry.status, entry.dayIndex, entry.fullDate)"
                  >
                    <td>{{ entry.status }}</td>
                    <td :title="entry.fullDate">{{ entry.date }}</td>
                    <td>{{ entry.day }}</td>
                    <td>{{ entry.start || '-' }}</td>
                    <td>{{ entry.end || '-' }}</td>
                    <td>{{ entry.workTime || '-' }}</td>
                    <td>
                      <select v-model="entry.task" :disabled="entry.status !== '未承認'">
                        <option value="">-</option>
                        <option v-for="opt in taskOptions" :key="opt" :value="opt">
                          {{ opt }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <button
                        class="primary-btn"
                        v-if="entry.status === '未承認'"
                        @click="submitReport(entry)"
                      >
                        提出
                      </button>

                      <button
                        class="danger-btn"
                        v-else-if="entry.status === '承認待'"
                        @click="cancelSubmission(entry)"
                      >
                        取消
                      </button>

                      <span v-else>-</span>
                    </td>
                  </tr>

                  <tr v-if="records.length === 0">
                    <td class="no-data" colspan="8">データがありません</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- /table -->
        </div>
      </div>
      <!-- /center-area -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const props = defineProps<{
  uid: string
  /** 親から渡されるログイン中ユーザー名（未指定なら "ユーザー名" を表示） */
  username?: string
}>()

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)

/** 表示ユーザー名（親 props 優先、なければ既定文字列） */
const displayUsername = computed(() => (props.username ?? '').trim() || 'ユーザー名')

const taskOptions = ['現場作業', '資料作成', '営業', '顧客対応', '休暇'] as const

type StatusType = '未承認' | '承認待' | '承認済'
interface RecordEntry {
  date: string
  fullDate: string
  day: string
  dayIndex: number
  start?: string
  end?: string
  workTime?: string
  task?: string
  status: StatusType
}

const records = ref<RecordEntry[]>([])
const totalWorkTime = ref('00:00')
const isLoading = ref(false)

/** 祝日セット（YYYY-MM-DD の Set）— 取得できなければ空のまま */
const holidaySet = ref<Set<string>>(new Set())

/** JST向け：ローカル暦日で YYYY-MM-DD 文字列（UTC変換による日付ズレ防止） */
const toLocalYMD = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** 勤務時間差分 "HH:MM" を返す */
const calculateWorkDuration = (startStr?: string, endStr?: string): string | undefined => {
  if (!startStr || !endStr) return undefined
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined

  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin <= startMin) return undefined

  const diffMin = endMin - startMin
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 合計勤務時間算出 */
const computeTotalWorkTime = () => {
  let totalMin = 0
  for (const entry of records.value) {
    if (entry.workTime) {
      const [h, m] = entry.workTime.split(':').map(Number)
      totalMin += h * 60 + m
    }
  }
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  totalWorkTime.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 祝日取得（存在すれば使用、失敗時は空のまま） */
const fetchHolidays = async (y: number, m: number) => {
  try {
    const res = await axios.get<string[]>(
      `${API_BASE_URL}/api/attendance/holidays`,
      { params: { year: y, month: String(m).padStart(2, '0') } }
    )
    const arr = Array.isArray(res.data) ? res.data : []
    holidaySet.value = new Set(arr)
  } catch (e) {
    // 取得に失敗したら土日のみ赤運用
    holidaySet.value = new Set()
  }
}

/** 月のデータ取得（JSTで暦日/曜日を決定） */
const fetchRecords = async () => {
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  isLoading.value = true
  try {
    // 可能なら祝日を取得（失敗しても続行）
    await fetchHolidays(year.value, month.value)

    const res = await axios.get(`${API_BASE_URL}/api/attendance`, {
      params: {
        uid: props.uid,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })

    // ✅ インデックスアクセスの型エラー回避：Record<string, any> として扱う
    const data = (res.data ?? {}) as Record<string, any>

    const result: RecordEntry[] = []
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']

    for (let d = 1; d <= daysInMonth; d++) {
      // JST基準：ローカル時刻のDateで曜日を決定
      const local = new Date(year.value, month.value - 1, d) // 0=1月
      const full = toLocalYMD(year.value, month.value, d)    // YYYY-MM-DD（JST暦日）
      const dayIndex = local.getDay()                        // 0=日, ... ,6=土（JST）

      const raw = (data[full] ?? {}) as Record<string, any>
      const start: string | undefined = raw.start
      const end: string | undefined = raw.end
      const workTime = calculateWorkDuration(start, end)

      result.push({
        date: `${month.value}/${d}`,
        fullDate: full,
        day: dayNames[dayIndex],
        dayIndex,
        start,
        end,
        workTime,
        task: (raw.task ?? '').toString(),
        status: (raw.status as StatusType) || '未承認',
      })
    }

    records.value = result
    computeTotalWorkTime()
  } catch (e) {
    console.error('勤務実績取得失敗', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchRecords)
watch([year, month], fetchRecords)

/** 月移動 */
const prevMonth = () => {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else {
    month.value--
  }
}
const nextMonth = () => {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else {
    month.value++
  }
}

/** 週末判定（日:0, 土:6）※ JST基準 */
const isWeekend = (i: number) => i === 0 || i === 6
/** 祝日判定 */
const isHoliday = (ymd: string) => holidaySet.value.has(ymd)

/**
 * ステータスによる行クラス
 * - 承認済は青、承認待は黄（週末/祝日でもこちらを優先）
 * - 未承認は平日=白、土日/祝日=赤
 */
const getStatusClass = (status: StatusType, dayIndex: number, ymd: string) => {
  if (status === '承認済') return 'status-approved'
  if (status === '承認待') return 'status-pending'
  // 未承認のみ週末/祝日で赤
  return (isWeekend(dayIndex) || isHoliday(ymd))
    ? 'status-unsubmitted-weekend'
    : 'status-unsubmitted'
}

/** 提出 */
const submitReport = async (entry: RecordEntry) => {
  // 作業内容の厳密チェック（空文字・空白のみ・「-」は不可）
  const taskVal = (entry.task ?? '').toString().trim()
  if (!taskVal || taskVal === '-') {
    alert('作業内容を選択してください（空欄や「-」は不可）')
    return
  }
  if (taskVal !== '休暇') {
    if (!entry.start || !entry.end) {
      alert('出勤時間と退勤時間を入力してください')
      return
    }
  }
  try {
    await axios.post(`${API_BASE_URL}/api/attendance/report`, {
      uid: props.uid,
      date: entry.fullDate, // JSTの暦日キー
      start: entry.start,
      end: entry.end,
      task: taskVal,
      status: '承認待',
    })
    entry.status = '承認待'
  } catch (error) {
    console.error('勤務報告の送信に失敗しました:', error)
    alert('勤務報告の送信に失敗しました')
  }
}

/** 取消 */
const cancelSubmission = async (entry: RecordEntry) => {
  try {
    await axios.post(`${API_BASE_URL}/api/attendance/report`, {
      uid: props.uid,
      date: entry.fullDate, // JSTの暦日キー
      start: entry.start,
      end: entry.end,
      task: entry.task,
      status: '未承認',
    })
  } catch (error) {
    console.error('勤務報告の取消に失敗しました:', error)
    alert('取消に失敗しました')
  } finally {
    entry.status = '未承認'
  }
}
</script>

<style scoped>
/* レイアウト */
.report-container {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ✅ 中央寄せの土台：サマリー以外（main-content内）を中央寄せ */
.main-content {
  flex: 1;
  min-width: 0;
  padding-right: 6px;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== サマリー ===== */
.summary-card {
  align-self: flex-start;
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin-top: 0.4rem;

  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.summary-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.95rem;
}

.summary-table th,
.summary-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.summary-table tr:last-child th,
.summary-table tr:last-child td {
  border-bottom: none;
}

.summary-table th:last-child,
.summary-table td:last-child {
  border-right: none;
}

.summary-table th {
  background: #f8fafc;
  font-weight: 700;
  width: 120px;
}

/* ===== 中央寄せ：月切替＋テーブルを同一基準にする ===== */
.center-area {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* ✅ ここが「中央基準」の箱（スマホではここを縮小） */
.scaled-area {
  display: inline-block;
  transform: none;
  transform-origin: top center;
}

/* ===== 月切替 ===== */
.month-selector {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem 0;
  align-items: center;

  width: fit-content;
  margin-left: auto;
  margin-right: auto;
}

.nav-btn {
  min-width: 2rem;
  min-height: 2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font-size: 0.95rem;
}
.nav-btn:hover {
  background: #f1f5f9;
}
.month-selector span {
  font-weight: 700;
}

/* ===== テーブル（スクロール担当） ===== */
.table-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: auto; /* PCはOK */
  padding: 0;
}

/* ===== 枠担当 ===== */
.table-frame {
  display: inline-block;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

/* ===== 勤務実績テーブル ===== */
.record-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.92rem;
  color: #0f172a;
  min-width: 640px; /* PC用 */
}

.record-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #edf2ff;
  text-align: center;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 2px solid #94a3b8;
  border-right: 1px solid #e2e8f0;
  white-space: nowrap;
}
.record-table thead th:last-child {
  border-right: none;
}

.record-table th,
.record-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.record-table th:last-child,
.record-table td:last-child {
  border-right: none;
}

/* 列幅配分（割合） */
.record-table th:nth-child(1),
.record-table td:nth-child(1) { width: 10%; }
.record-table th:nth-child(2),
.record-table td:nth-child(2) { width: 8%; }
.record-table th:nth-child(3),
.record-table td:nth-child(3) { width: 6%; }
.record-table th:nth-child(4),
.record-table td:nth-child(4) { width: 9%; }
.record-table th:nth-child(5),
.record-table td:nth-child(5) { width: 9%; }
.record-table th:nth-child(6),
.record-table td:nth-child(6) { width: 10%; }
.record-table th:nth-child(7),
.record-table td:nth-child(7) { width: 26%; }
.record-table th:nth-child(8),
.record-table td:nth-child(8) { width: 12%; }

.record-table select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.25rem 0.35rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
}

/* 行背景 */
.record-table tbody tr { background: #ffffff; }

/* 状態色 */
.record-table tbody tr.status-unsubmitted { background-color: #ffffff; }
.record-table tbody tr.status-unsubmitted-weekend { background-color: #ffe4e6; }
.record-table tbody tr.status-pending { background-color: #fff1a6; }
.record-table tbody tr.status-approved { background-color: #dbeafe; }

/* ボタン */
.primary-btn {
  padding: 0.4rem 0.8rem;
  background-color: #2563eb;
  color: #ffffff;
  border: 1px solid #2563eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.primary-btn:hover { filter: brightness(1.05); }

.danger-btn {
  padding: 0.4rem 0.8rem;
  background-color: #ef4444;
  color: #ffffff;
  border: 1px solid #ef4444;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.danger-btn:hover { filter: brightness(1.05); }

/* “データなし”表示 */
.no-data {
  text-align: center;
  color: #64748b;
  padding: 12px 0;
  font-weight: 600;
}

/* ===== スマホ最適化 ===== */
@media (max-width: 600px) {
  /* ✅ 画面全体の横スクロールを止める（これ超重要） */
  .report-container {
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .main-content {
    width: 100%;
    max-width: 100%;
    padding-right: 0;          /* ★これが地味にズレ要因 */
    overflow-x: hidden;
  }

  /* スマホ時はサマリーも縮小＆中央へ */
  .summary-card {
    align-self: center;
  }

  /* 中央基準の箱も横はみ出し禁止 */
  .center-area {
    width: 100%;
    overflow-x: hidden;
    display: flex;
    justify-content: center;
  }

  /* ▼ スマホ縮小率（端末で微調整OK） */
  .report-container {
    --m-scale: 0.58;
  }

  /* まずは “スクロール発生源” を止める */
  .table-scroll {
    overflow-x: hidden; /* ★スマホは横スクロール禁止 */
    width: 100%;
    max-width: 100%;
    display: flex;
    justify-content: center;
  }

  /* ✅ zoomが効くブラウザ（Chrome/Edge系）はこれが一番安定 */
  @supports (zoom: 1) {
    .scaled-area {
      zoom: var(--m-scale);
    }
    .summary-card {
      zoom: var(--m-scale);
    }
  }

  /* ✅ zoomが効かない場合の保険（Safari等） */
  @supports not (zoom: 1) {
    .scaled-area {
      position: relative;
      left: 50%;
      transform: translateX(-50%) scale(var(--m-scale));
      transform-origin: top center;
    }
    .summary-card {
      position: relative;
      left: 50%;
      transform: translateX(-50%) scale(var(--m-scale));
      transform-origin: top center;
    }
  }
}
</style>

