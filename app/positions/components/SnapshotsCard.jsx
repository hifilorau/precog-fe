'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import apiFetch from '@/lib/apiFetch'
import { useStateContext } from '@/app/store'

const RANGE_PRESETS = [
  { key: '1h', label: '1h', params: { since_hours: 1 } },
  { key: '24h', label: '24h', params: { since_hours: 24 } },
  { key: '7d', label: '7d', params: { days: 7 } },
  { key: '30d', label: '30d', params: { days: 30 } },
]

export default function SnapshotsCard() {
  const { walletAddress } = useStateContext()
  const [range, setRange] = useState('24h')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buildUrls = useCallback(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/?$/, '/')
    const preset = RANGE_PRESETS.find(p => p.key === range) || RANGE_PRESETS[0]
    const params = new URLSearchParams()
    if (preset.params.since_hours) params.set('since_hours', String(preset.params.since_hours))
    if (preset.params.days) params.set('days', String(preset.params.days))
    if (walletAddress) params.set('wallet_address', walletAddress)
    params.set('limit', '2000')
    const qs = params.toString()
    // Try both without and with trailing slash to avoid redirect mismatches
    return [
      `${base}snapshots?${qs}`,
      `${base}snapshots/?${qs}`,
    ]
  }, [range, walletAddress])

  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const urls = buildUrls()
      let res
      for (const url of urls) {
        res = await apiFetch(url)
        if (res.ok) break
      }
      if (!res || !res.ok) {
        const text = res ? (await res.text().catch(() => res.statusText)) : 'No response'
        throw new Error(text || `Failed to load snapshots (${res?.status})`)
      }
      const json = await res.json()
      const items = Array.isArray(json) ? json : (Array.isArray(json?.items) ? json.items : [])
      setData(items)
    } catch (e) {
      console.error('Snapshots fetch error:', e)
      setError(e?.message || 'Failed to load snapshots')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [buildUrls])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  const chartData = useMemo(() => {
    return (data || []).map(item => ({
      timestamp: item.captured_at,
      total_value: Number(item.total_value ?? 0),
      portfolio_value: Number(item.portfolio_value ?? 0),
      usdc_balance: Number(item.usdc_balance ?? 0),
      positions_count: Number(item.positions_count ?? 0),
    }))
  }, [data])

  const formatCurrency = (v) => `$${(Number(v) || 0).toFixed(2)}`

  return (
    <Card className="md:col-span-2 bg-peach-surface rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-peach-heading">Portfolio Snapshot</CardTitle>
        <div className="flex gap-1">
          {RANGE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setRange(p.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                range === p.key
                  ? 'btn-peach border-peach'
                  : 'bg-white text-peach-heading border-peach hover:bg-[#fff9f6]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-xs text-red-600">{error}</div>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efd5cc" />
                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleString()} hide={chartData.length > 40} tick={{ fill: '#a67968', fontSize: 11 }} axisLine={{ stroke: '#efd5cc' }} tickLine={{ stroke: '#efd5cc' }} />
                <YAxis tickFormatter={(v) => `$${v}`}
                  tick={{ fill: '#a67968', fontSize: 11 }}
                  axisLine={{ stroke: '#efd5cc' }}
                  tickLine={{ stroke: '#efd5cc' }}
                />
                <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  formatter={(value, name) => [formatCurrency(value), name.replace('_', ' ')]}
                />
                <Legend wrapperStyle={{ color: '#7c3f2a' }} />
                <Line type="monotone" dataKey="total_value" name="Total Value" stroke="#6b86c9" strokeWidth={2.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="portfolio_value" name="Portfolio" stroke="#63a483" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="usdc_balance" name="USDC" stroke="#e6a072" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {loading && (
          <div className="text-xs text-peach-muted mt-2">Loading snapshots…</div>
        )}
      </CardContent>
    </Card>
  )
}
