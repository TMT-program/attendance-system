<template>
  <div class="confirm-report-tab">
    <!-- サマリー（UIトーン統一：カード） -->
    <div class="summary-card">
      <table class="summary-table" role="table" aria-label="勤務実績サマリー">
        <tbody>
          <tr>
            <th scope="row">ユーザー名</th>
            <td>{{ user.displayName }}</td>
          </tr>
          <tr>
            <th scope="row">対象年月</th>
            <td>{{ year }}年{{ month }}月</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 月切替 -->
    <div class="month-selector">
      <button class="nav-btn" @click="prevMonth">←</button>
      <span>{{ year }}年{{ month }}月</span>
      <button class="nav-btn" @click="nextMonth">→</button>
    </div>

    <!-- CSV出力 -->
    <div class="button-group">
      <button class="csv-button" @click="downloadCSV">CSV出力</button>
    </div>

    <LoadingSpinner v-if="isLoading" />

    <!-- 実績テーブル（中央揃え・白背景・状態色・縦線・stickyヘッダー） -->
    <div v-else class="table-wrapper">
      <table class="record-table" role="table" aria-label="勤務実績テーブル（管理者確認）">
        <thead>
          <tr>
            <th scope="col">日付</th>
            <th scope="col">曜日</th>
            <th scope="col">出勤</th>
            <th scope="col">退勤</th>
            <th scope="col">作業内容</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in records"
            :key="entry.fullDate"
            :class="getStatusClass(entry.status, entry.dayIndex, entry.fullDate)"
          >
            <td :title="entry.fullDate">{{ entry.date }}</td>
            <td>{{ entry.day }}</td>
            <td>{{ entry.start || '-' }}</td>
            <td>{{ entry.end || '-' }}</td>
            <td>{{ entry.task || '-' }}</td>
            <td>{{ entry.status }}</td>
            <td>
              <div class="action-buttons">
                <button
                  v-if="entry.status === '承認待'"
                  class="primary-btn"
                  @click="approve(entry)"
                >承認</button>
                <button
                  v-if="entry.status === '承認待'"
                  class="danger-btn"
                  @click="reject(entry)"
                >却下</button>
                <button
                  v-if="entry.status === '承認済'"
                  class="secondary-btn"
                  @click="revoke(entry)"
                >取消</button>
                <span v-if="entry.status === '未承認'">-</span>
              </div>
            </td>
          </tr>
          <tr v-if="records.length === 0">
            <td class="no-data" colspan="7">データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const props = defineProps<{
  user: { uid: string; displayName: string }
}>()

type StatusType = '未承認' | '承認待' | '承認済'

interface RecordEntry {
  date: string        // M/D 表示
  fullDate: string    // YYYY-MM-DD（JST暦日）
  day: string         // 日〜土
  dayIndex: number    // 0(日)〜6(土)
  start?: string
  end?: string
  task?: string
  status: StatusType
}

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const records = ref<RecordEntry[]>([])
const isLoading = ref(false)

/** 祝日（YYYY-MM-DD 文字列の Set）。取得失敗時は空のまま。 */
const holidaySet = ref<Set<string>>(new Set())

/** JST向け：ローカル暦日で YYYY-MM-DD 文字列（UTC変換によるズレを回避） */
const toLocalYMD = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** 祝日取得（同月の祝日だけ返すAPI想定） */
const fetchHolidays = async (y: number, m: number) => {
  try {
    const res = await axios.get<string[]>(
      `${API_BASE_URL}/api/attendance/holidays`,
      { params: { year: y, month: String(m).padStart(2, '0') } }
    )
    const arr = Array.isArray(res.data) ? res.data : []
    holidaySet.value = new Set(arr)
  } catch (e) {
    // フォールバック：祝日が取れなくても土日で判定できるので空セット
    holidaySet.value = new Set()
  }
}

/** レコード取得（JSTの暦日/曜日を用いる） */
const fetchRecords = async () => {
  isLoading.value = true
  try {
    // まず祝日（失敗しても続行）
    await fetchHolidays(year.value, month.value)

    const res = await axios.get(`${API_BASE_URL}/api/attendance`, {
      params: {
        uid: props.user.uid,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = res.data || {}
    const result: RecordEntry[] = []

    const daysInMonth = new Date(year.value, month.value, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const local = new Date(year.value, month.value - 1, d) // JSTローカル
      const fullDate = toLocalYMD(year.value, month.value, d)
      const dayIndex = local.getDay() // 0=日,6=土
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const raw = data[fullDate] || {}

      result.push({
        date: `${month.value}/${d}`,
        fullDate,
        day: dayNames[dayIndex],
        dayIndex,
        start: raw.start || '',
        end: raw.end || '',
        task: raw.task || '',
        status: (raw.status as StatusType) || '未承認',
      })
    }

    records.value = result
  } catch (e) {
    console.error('勤務報告取得失敗', e)
  } finally {
    isLoading.value = false
  }
}

/** 月移動 */
const prevMonth = () => {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else {
    month.value--
  }
  fetchRecords()
}
const nextMonth = () => {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else {
    month.value++
  }
  fetchRecords()
}

/** 週末・祝日判定 */
const isWeekend = (i: number) => i === 0 || i === 6
const isHoliday = (ymd: string) => holidaySet.value.has(ymd)

/**
 * ステータス→行クラス
 * - 承認済：青
 * - 承認待：黄
 * - 未承認：平日=白、土日/祝日=赤
 */
const getStatusClass = (status: StatusType, dayIndex: number, ymd: string) => {
  if (status === '承認済') return 'status-approved'
  if (status === '承認待') return 'status-pending'
  return (isWeekend(dayIndex) || isHoliday(ymd))
    ? 'status-unsubmitted-weekend'
    : 'status-unsubmitted'
}

/** 承認 */
const approve = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/approve`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('承認処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

/** 却下（未承認へ） */
const reject = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/reject`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('却下処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

/** 取消（承認済→承認待へ） */
const revoke = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/revoke`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('取消処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

/** CSV出力 */
const downloadCSV = () => {
  const headers = ['日付', '曜日', '出勤', '退勤', '作業内容', '状態']
  const rows = records.value.map(r => [
    r.date,
    r.day,
    r.start || '-',
    r.end || '-',
    r.task || '-',
    r.status,
  ])
  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${val}"`).join(','))
    .join('\r\n')

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const username = (props.user.displayName || 'user').replace(/\s+/g, '_')
  const fileName = `勤務実績_${username}_${year.value}_${String(month.value).padStart(2, '0')}.csv`
  link.setAttribute('download', fileName)

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

onMounted(fetchRecords)
watch([year, month], fetchRecords)
</script>

<style scoped>
.confirm-report-tab {
  padding: 1rem;
  max-width: 960px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ===== サマリー（カード＋縦線＋左寄せ） ===== */
.summary-card {
  min-width: 260px;
  margin: 0.4rem 0 0.8rem 0;
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
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0; /* 縦線 */
  text-align: left; /* サマリーは左寄せ */
  white-space: nowrap;
}
.summary-table tr:last-child th,
.summary-table tr:last-child td { border-bottom: none; }
.summary-table th:last-child,
.summary-table td:last-child { border-right: none; }
.summary-table th { background: #f8fafc; font-weight: 700; width: 140px; }

/* ===== 月切替（統一トーン） ===== */
.month-selector {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin: 0 0 0.75rem 0;
  align-items: center;
}
.nav-btn {
  min-width: 2.2rem;
  min-height: 2.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
}
.nav-btn:hover { background: #f1f5f9; }
.month-selector span { font-weight: 700; }

/* ===== CSVボタン ===== */
.button-group {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.6rem;
}
.csv-button {
  padding: 0.45rem 1rem;
  background-color: #10b981;
  color: #ffffff;
  border: 1px solid #10b981;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}
.csv-button:hover { filter: brightness(1.05); }

/* ===== テーブル（中央揃え・白背景・縦線・stickyヘッダー） ===== */
.table-wrapper {
  width: 100%;
  overflow-x: auto; /* 念のため残す（狭小画面対策） */
  border: 1px solid #cbd5e1; /* 外枠でくっきり */
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
}

.record-table {
  width: 100%;
  border-collapse: separate; /* 罫線を明確に */
  border-spacing: 0;
  font-size: 0.92rem; /* 少し小さめで横幅節約 */
  color: #0f172a;
  min-width: 740px; /* 操作列が見切れないように確保 */
}

.record-table thead th {
  position: sticky; /* スクロールでもヘッダー固定 */
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
.record-table thead th:last-child { border-right: none; }

.record-table th,
.record-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: center; /* 中央揃え */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.record-table th:last-child,
.record-table td:last-child { border-right: none; }

/* 列幅（コンパクト化） */
.record-table th:nth-child(1), .record-table td:nth-child(1) { width: 84px; }  /* 日付 */
.record-table th:nth-child(2), .record-table td:nth-child(2) { width: 60px; }  /* 曜日 */
.record-table th:nth-child(3), .record-table td:nth-child(3) { width: 80px; }  /* 出勤 */
.record-table th:nth-child(4), .record-table td:nth-child(4) { width: 80px; }  /* 退勤 */
.record-table th:nth-child(5), .record-table td:nth-child(5) { width: 140px; } /* 作業内容 */
.record-table th:nth-child(6), .record-table td:nth-child(6) { width: 84px; }  /* 状態 */
.record-table th:nth-child(7), .record-table td:nth-child(7) { width: 160px; } /* 操作 */

/* デフォルトは白背景（ゼブラなし） */
.record-table tbody tr { background: #ffffff; }

/* ===== 状態色（強いセレクタ＆最後に配置） =====
   承認済：青、承認待：黄、未承認：白、未承認の土日/祝日：赤 */
.record-table tbody tr.status-unsubmitted         { background-color: #ffffff; }
.record-table tbody tr.status-unsubmitted-weekend { background-color: #ffe4e6; } /* 赤 */
.record-table tbody tr.status-pending             { background-color: #fff1a6; } /* 黄 */
.record-table tbody tr.status-approved            { background-color: #dbeafe; } /* 青 */

/* ===== 操作ボタン ===== */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.primary-btn {
  padding: 0.35rem 0.8rem;
  background-color: #2563eb;  /* 青（承認） */
  color: #ffffff;
  border: 1px solid #2563eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.primary-btn:hover { filter: brightness(1.05); }

.danger-btn {
  padding: 0.35rem 0.8rem;
  background-color: #ef4444;  /* 赤（却下） */
  color: #ffffff;
  border: 1px solid #ef4444;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.danger-btn:hover { filter: brightness(1.05); }

.secondary-btn {
  padding: 0.35rem 0.8rem;
  background-color: #ffffff;   /* 取消はニュートラル */
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.secondary-btn:hover { background: #f1f5f9; }

/* “データなし”表示 */
.no-data {
  text-align: center;
  color: #64748b;
  padding: 12px 0;
  font-weight: 600;
}

/* スマホ倍率調整 */
@media (max-width: 600px) {
  .confirm-report-tab { transform: scale(0.9); transform-origin: top left; }
  .summary-card,
  .table-wrapper { transform: scale(0.95); transform-origin: top left; }
}
</style>
