import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

declare global {
  interface Window {
    __selectedTimeGroup: number;
  }
}

function CustomTooltip({ active, payload }: any) {
  // timeGroupをAppのstateから取得
  const timeGroup = window.__selectedTimeGroup;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, color: '#000' }}>
        <div><strong>Date:</strong> {convertUnitTimeToDate(data.unitTime, timeGroup)}</div>
        <div><strong>Air Temp:</strong> {data.airTemp}</div>
        <div><strong>Water Temp:</strong> {data.waterTemp}</div>
      </div>
    );
  }
  return null;
}

function convertUnitTimeToDate(unitTime: number, timeGroup: number): string {
  const date = new Date(unitTime * 1000);
  if (timeGroup >= 20) {
    return date.toLocaleDateString();
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

function convertDateToUnixtime(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function App() {
  const [aquaenv, setAquaenv] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeGroup, setTimeGroup] = useState(10)
  window.__selectedTimeGroup = timeGroup
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateTimeLocal = (date: Date, before:number) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate()-before)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const [startDate, setStartDate] = useState(formatDateTimeLocal(new Date(), 1));
  const [endDate, setEndDate] = useState(formatDateTimeLocal(new Date(), 0));
  const startAt = convertDateToUnixtime(new Date(startDate))
  const endAt = convertDateToUnixtime(new Date(endDate))

  // fanSwがONのときだけwaterTempを持つデータ
  const waterTempRed = aquaenv.map(row => row.fanSw === 'ON' ? { ...row } : { ...row, waterTemp: null })

  useEffect(() => {
    setLoading(true)
    fetch('https://hanpen.f5.si/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-REQUEST-TYPE': 'GraphQL',
      },
      body: JSON.stringify({
        query: `query { aquaenv(startAt:${startAt}, endAt:${endAt}, timeGroup:${timeGroup}) { id date time unixtime unitTime airTemp waterTemp timeGroup fanSw } }`
      })
    })
      .then(res => res.json())
      .then(data => {
        setAquaenv(data.data?.aquaenv || [])
        setLoading(false)
      })
      .catch(() => {
        setError('データ取得に失敗しました')
        setLoading(false)
      })
  }, [timeGroup, startDate, endDate])

  return (
    <>
      <h1>Aquarium Dashboard</h1>
      <div>
        {/* MJPEGストリーム表示 */}
        <div style={{ marginTop: 24 }}>
          <h2>ライブ映像</h2>
          {/* <img
            src="https://hanpen.f5.si/mjpeg"
            alt="Aquarium Live Stream"
            style={{ width: '100%', maxWidth: 640, border: '1px solid #ccc' }}
          /> */}
          		<div class="stream">
			<!-- Use the img tag to show MJPEG stream directly in the browser -->
			<img id="mjpeg" src="/mjpeg" width="640" height="480" alt="MJPEG stream" />
		</div>

		<div class="controls">
			<button id="reload">Reload Stream</button>
			<label style="margin-left:12px">Stream URL: <code id="url">/mjpeg</code></label>
		</div>

		<script>
			const img = document.getElementById('mjpeg');
			const reload = document.getElementById('reload');
			const urlEl = document.getElementById('url');

			reload.addEventListener('click', () => {
				// force the browser to re-request the MJPEG stream
				const url = '/mjpeg?ts=' + Date.now();
				img.src = url;
				urlEl.textContent = url;
			});

			// Provide a simple visibility handler to stop reloading when tab hidden
			document.addEventListener('visibilitychange', () => {
				if (document.hidden) {
					// pause by pointing to a small blank image
					img.dataset.prev = img.src;
					img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
				} else {
					img.src = img.dataset.prev || '/mjpeg';
				}
			});
		</script>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div>
            <label style={{ marginRight: 16 }}>
              開始日時:
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div>
            <label style={{ marginRight: 16 }}>
              終了日時:
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              timeGroup:
              <select value={timeGroup} onChange={e => setTimeGroup(Number(e.target.value))} style={{ marginLeft: 8 }}>
                <option value={0}>10分ごと</option>
                <option value={10}>1時間ごと</option>
                <option value={20}>6時間ごと</option>
                <option value={30}>1日ごと</option>
              </select>
            </label>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && (
          <>            
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={aquaenv} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="unitTime"
                    tickFormatter={tick => convertUnitTimeToDate(tick, timeGroup)}
                  />
                  <YAxis domain={[10, 35]}/>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="airTemp" stroke="#e98e25ff" name="Air Temp" />
                  <Line type="monotone" dataKey="waterTemp" stroke="#57bcffff" name="Water Temp (通常)"  />
                  <Line type="monotone" dataKey="waterTemp" stroke="#ff1e1efb" name="Water Temp (Fan ON)" data={waterTempRed} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </>
        )}
      </div>
    </>
  )
}

export default App
