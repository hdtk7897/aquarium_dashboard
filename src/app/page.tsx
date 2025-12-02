"use client"
import Image from "next/image";
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
// import './App.css'

declare global {
  interface Window {
    __selectedTimeGroup?: number;
  }
}

function CustomTooltip({ active, payload }: any) {
  // timeGroupをAppのstateから取得
  const timeGroup = window.__selectedTimeGroup;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, color: '#000' }}>
        <div><strong>Date:</strong> {data.unitTime !== undefined ? convertUnitTimeToDate(data.unitTime, timeGroup) : 'N/A'}</div>
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

interface AquaEnv {
  id: string;
  date: string;
  time: string;
  unixtime: number;
  unitTime: number;
  airTemp: number;
  waterTemp: number | null;
  timeGroup: number;
  fanSw: string;
}

export default function Home() {
  const [aquaenv, setAquaenv] = useState<AquaEnv[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeGroup, setTimeGroup] = useState(10)
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
      .then(res => res.json() as Promise<{ data?: { aquaenv?: AquaEnv[] } }>)
      .then((data) => {
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
          <img
            src="https://hanpen.f5.si/mjpeg"
            alt="Aquarium Live Stream"
            style={{ width: '100%', maxWidth: 640, border: '1px solid #ccc' }}
          />
          
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
                <option value={0}>10秒ごと</option>
                <option value={10}>1分ごと</option>
                <option value={20}>半日ごと</option>
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
