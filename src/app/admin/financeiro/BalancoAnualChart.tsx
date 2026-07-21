'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface BalancoAnualChartData {
  name: string
  Despesas: number
  Receitas: number
  Lucro: number
}

export default function BalancoAnualChart({ chartData }: { chartData: BalancoAnualChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          formatter={(value) => fmt(Number(value ?? 0))}
          contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="Despesas" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Receitas" fill="#86EFAC" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="Lucro"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3B82F6' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
