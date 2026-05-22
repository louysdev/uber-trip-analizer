"use client"

import { useState, useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import { useTheme } from "next-themes"

// ---- Types ----
interface TripData {
  id: string
  date: string | null
  dateLabel: string
  product_type: string
  fare: number
  currency: string
  distance: number
  duration: string
  pickup: string
  dropoff: string
  status: string
}

interface TripSummary {
  total_trips: number
  total_fare: number
  total_distance: number
  vehicle_types: string[]
  by_type: Record<string, { count: number; total_fare: number; total_distance: number; avg_fare: number }>
}

// ---- Helpers ----
function fmtDate(d: string | null) {
  if (!d) return "-"
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtCurrency(n: number) {
  return n.toLocaleString("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 })
}

function fmtDuration(dur: string) {
  if (!dur) return "-"
  const m = dur.match(/(\d+)\s*(min|minutes)/i)
  return m ? m[1] + "min" : dur
}

const TYPE_COLORS: Record<string, string> = {
  Cancelado: "#e74c3c",
}
function getColor(type: string) {
  if (TYPE_COLORS[type]) return TYPE_COLORS[type]
  const colors = ["#276ef1", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#3498db", "#f1c40f", "#d35400"]
  const idx = Object.keys(TYPE_COLORS).length % colors.length
  TYPE_COLORS[type] = colors[idx]
  return colors[idx]
}

// ---- Component ----
export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Data
  const [allTrips, setAllTrips] = useState<TripData[]>([])
  const [filtered, setFiltered] = useState<TripData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [statusText, setStatusText] = useState("")
  const [statusClass, setStatusClass] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [searchFrom, setSearchFrom] = useState("")
  const [searchTo, setSearchTo] = useState("")
  const [searchType, setSearchType] = useState("all")

  // Refs for charts
  const chartTypeRef = useRef<HTMLCanvasElement>(null)
  const chartCostRef = useRef<HTMLCanvasElement>(null)
  const chartTypeInst = useRef<Chart | null>(null)
  const chartCostInst = useRef<Chart | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Default dates
  useEffect(() => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - 30)
    setSearchFrom(from.toISOString().split("T")[0])
    setSearchTo(to.toISOString().split("T")[0])
    checkStatus()
  }, [])

  // Derive filtered from allTrips + searchType
  useEffect(() => {
    let result = allTrips
    if (searchType !== "all") {
      result = allTrips.filter(t => t.product_type === searchType)
    }
    setFiltered(result)
  }, [allTrips, searchType])

  // ---- Status ----
  async function checkStatus() {
    setStatusText("Verificando conexión...")
    setStatusClass("wait")
    try {
      const resp = await fetch("/api/status")
      const data = await resp.json()
      if (data.status === "ok") {
        setStatusText("Conectado a Brave")
        setStatusClass("ok")
      } else {
        setStatusText(data.message || "Error")
        setStatusClass("err")
      }
    } catch {
      setStatusText("Servidor no disponible")
      setStatusClass("err")
    }
  }

  // ---- Search ----
  async function searchTrips() {
    if (!searchFrom || !searchTo) return

    if (new Date(searchFrom) > new Date(searchTo)) {
      setError('La fecha "Desde" no puede ser mayor que "Hasta"')
      return
    }

    setError("")
    setHasSearched(false)
    setLoading(true)

    try {
      const resp = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: searchFrom, to: searchTo }),
      })
      const data = await resp.json()

      if (!resp.ok) {
        setError(data.error || "Error del servidor")
        return
      }

      // Rename "Unknown" → "Cancelado"
      const trips: TripData[] = ((data.trips || []) as any[]).map((t: any) => ({
        id: t.id,
        date: t.date,
        dateLabel: t.dateLabel || "",
        product_type: t.product_type === "Unknown" ? "Cancelado" : t.product_type,
        fare: t.fare || 0,
        currency: t.currency || "DOP",
        distance: t.distance || 0,
        duration: t.duration || "",
        pickup: t.pickup || "",
        dropoff: t.dropoff || "",
        status: t.status || "COMPLETED",
      }))
      setAllTrips(trips)
      setHasSearched(true)

      if (trips.length === 0) {
        setError("No se encontraron viajes en ese rango de fechas")
        return
      }

      setStatusText("Conectado a Brave")
      setStatusClass("ok")
    } catch (err: any) {
      setError("Error de conexión: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ---- Render charts (via Chart.js) ----
  useEffect(() => {
    if (filtered.length === 0 || !chartTypeRef.current || !chartCostRef.current) return

    const groups: Record<string, { count: number; totalFare: number }> = {}
    filtered.forEach(t => {
      const type = t.product_type || "(sin tipo)"
      if (!groups[type]) groups[type] = { count: 0, totalFare: 0 }
      groups[type].count++
      groups[type].totalFare += t.fare || 0
    })

    const labels = Object.keys(groups)
    const counts = labels.map(l => groups[l].count)
    const fares = labels.map(l => groups[l].totalFare)
    const colors = labels.map(l => getColor(l))

    // Bar chart
    if (chartTypeInst.current) chartTypeInst.current.destroy()
    chartTypeInst.current = new Chart(chartTypeRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.raw + " viajes",
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: "#999" },
            grid: { color: "rgba(255,255,255,.05)" },
          },
          x: {
            ticks: { color: "#999", maxRotation: 45 },
          },
        },
      },
    })

    // Doughnut chart
    if (chartCostInst.current) chartCostInst.current.destroy()
    chartCostInst.current = new Chart(chartCostRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: fares,
          backgroundColor: colors,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#999",
              padding: 12,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ctx.label + ": " + fmtCurrency(ctx.raw as number),
            },
          },
        },
      },
    })

    return () => {
      if (chartTypeInst.current) chartTypeInst.current.destroy()
      if (chartCostInst.current) chartCostInst.current.destroy()
    }
  }, [filtered])

  // ---- Export ----
  function exportCSV() {
    if (!filtered.length) return
    const rows = filtered.map(t => [
      t.date || "", t.product_type || "", t.fare || 0, t.distance || 0, t.duration || "",
      '"' + (t.pickup || "").replace(/"/g, '""') + '"',
      '"' + (t.dropoff || "").replace(/"/g, '""') + '"',
      t.status || "",
    ])
    const csv = ["Fecha,Tipo,Tarifa,Distancia_km,Duración,Origen,Destino,Estado", ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "uber-viajes.csv"
    a.click()
  }

  function exportJSON() {
    if (!filtered.length) return
    const clean = filtered.map(t => ({
      date: t.date, type: t.product_type, fare: t.fare, distance: t.distance,
      duration: t.duration, pickup: t.pickup, dropoff: t.dropoff, status: t.status,
    }))
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "uber-viajes.json"
    a.click()
  }

  // ---- Render helpers ----
  const totalFare = filtered.reduce((s, t) => s + (t.fare || 0), 0)
  const totalDist = filtered.reduce((s, t) => s + (t.distance || 0), 0)
  const types = new Set(filtered.map(t => t.product_type || "(sin tipo)"))
  const sortedTrips = [...filtered].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0
    const db = b.date ? new Date(b.date).getTime() : 0
    return db - da
  })

  const dates = filtered.filter(t => t.date).map(t => new Date(t.date!)).filter(d => !isNaN(d.getTime()))
  const dateRange = dates.length ? `${fmtDate(dates.reduce((a, b) => a < b ? a : b).toISOString())} — ${fmtDate(dates.reduce((a, b) => a > b ? a : b).toISOString())}` : "-"

  const groups = filtered.reduce((acc, t) => {
    const type = t.product_type || "(sin tipo)"
    if (!acc[type]) acc[type] = { count: 0, totalFare: 0, distances: [] as number[] }
    acc[type].count++
    acc[type].totalFare += t.fare || 0
    if (t.distance) acc[type].distances.push(t.distance)
    return acc
  }, {} as Record<string, { count: number; totalFare: number; distances: number[] }>)

  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].count - a[1].count)

  return (
    <>
      {/* Header */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap" as const,
        gap: "12px",
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: 0,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Uber Trip Analyzer
          <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 400, marginLeft: 4 }}>
            Extraé y analizá tus viajes
          </span>
        </h1>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? "☀️ Claro" : "🌙 Oscuro"}
        </button>
      </div>

      {/* Container */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        {/* Search bar */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap" as const,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>
              Desde
            </label>
            <input
              type="date"
              value={searchFrom}
              onChange={e => setSearchFrom(e.target.value)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 14px",
                color: "var(--text)",
                fontSize: 14,
                minWidth: 180,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>
              Hasta
            </label>
            <input
              type="date"
              value={searchTo}
              onChange={e => setSearchTo(e.target.value)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 14px",
                color: "var(--text)",
                fontSize: 14,
                minWidth: 180,
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>
              Tipo
            </label>
            <select
              value={searchType}
              onChange={e => setSearchType(e.target.value)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 14px",
                color: "var(--text)",
                fontSize: 14,
                minWidth: 140,
              }}
            >
              <option value="all">Todos</option>
              {hasSearched && [...new Set(allTrips.map(t => t.product_type))].sort().map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            onClick={searchTrips}
            disabled={loading}
            style={{
              padding: "10px 28px",
              background: loading ? "var(--text2)" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all .2s",
            }}
          >
            {loading ? "Buscando..." : "Buscar viajes"}
          </button>
          <div
            id="statusBadge"
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              marginLeft: "auto",
              background: statusClass === "ok" ? "rgba(46,204,113,.15)" :
                          statusClass === "err" ? "rgba(231,76,60,.15)" :
                          statusClass === "wait" ? "rgba(243,156,18,.15)" : "transparent",
              color: statusClass === "ok" ? "var(--green)" :
                     statusClass === "err" ? "var(--red)" :
                     statusClass === "wait" ? "var(--orange)" : "var(--text2)",
            }}
          >
            {statusText || "---"}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(231,76,60,.1)",
            border: "1px solid rgba(231,76,60,.3)",
            borderRadius: 8,
            padding: "16px 20px",
            color: "var(--red)",
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text2)" }}>
            <div style={{
              display: "inline-block",
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin .8s linear infinite",
              marginBottom: 12,
            }} />
            <p>Conectando a Brave y extrayendo viajes...</p>
            <p style={{ fontSize: 12, marginTop: 4, color: "var(--border)" }}>
              Esto puede tomar unos segundos
            </p>
          </div>
        )}

        {/* Dashboard */}
        {hasSearched && !loading && filtered.length > 0 && (
          <>
            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}>
              {[
                { label: "Viajes", value: filtered.length.toString(), color: "var(--accent)" },
                { label: "Gasto total", value: fmtCurrency(totalFare), color: "var(--green)" },
                { label: "Distancia total", value: totalDist.toFixed(1) + " km", color: "var(--orange)" },
                { label: "Tipos de viaje", value: types.size.toString(), color: "" },
                { label: "Período", value: dateRange, color: "", small: true },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontSize: stat.small ? 14 : 24,
                    fontWeight: stat.small ? 400 : 700,
                    marginTop: 4,
                    color: stat.color || "var(--text)",
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
              }}>
                <h3 style={{ fontSize: 14, color: "var(--text2)", marginBottom: 12, margin: 0 }}>
                  Viajes por tipo
                </h3>
                <div style={{ height: 300 }}>
                  <canvas ref={chartTypeRef} />
                </div>
              </div>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
              }}>
                <h3 style={{ fontSize: 14, color: "var(--text2)", marginBottom: 12, margin: 0 }}>
                  Gasto por tipo
                </h3>
                <div style={{ height: 300 }}>
                  <canvas ref={chartCostRef} />
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 20,
            }}>
              <div style={{
                padding: "14px 20px",
                fontSize: 14,
                fontWeight: 600,
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span>Desglose por tipo</span>
                <span style={{ color: "var(--text2)", fontWeight: 400, fontSize: 13 }}>
                  {filtered.length} viajes · {fmtCurrency(totalFare)}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr>
                      {["Tipo", "Viajes", "%", "Total", "Promedio", "Distancia total"].map(h => (
                        <th key={h} style={{
                          textAlign: "left",
                          padding: "10px 16px",
                          fontSize: 11,
                          textTransform: "uppercase" as const,
                          letterSpacing: ".5px",
                          color: "var(--text2)",
                          borderBottom: "1px solid var(--border)",
                          fontWeight: 600,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroups.map(([type, g]) => {
                      const pct = ((g.count / filtered.length) * 100).toFixed(1)
                      const avgFare = g.totalFare / g.count
                      const totalDist = g.distances.reduce((s, d) => s + d, 0)
                      return (
                        <tr key={type} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              marginRight: 8,
                              background: getColor(type),
                              verticalAlign: "middle",
                            }} />
                            {type}
                          </td>
                          <td style={{ padding: "10px 16px", fontWeight: 600 }}>{g.count}</td>
                          <td style={{ padding: "10px 16px", color: "var(--text2)" }}>{pct}%</td>
                          <td style={{ padding: "10px 16px" }}>{fmtCurrency(g.totalFare)}</td>
                          <td style={{ padding: "10px 16px" }}>{fmtCurrency(avgFare)}</td>
                          <td style={{ padding: "10px 16px" }}>{totalDist.toFixed(1)} km</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}>
                <h3 style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>Todos los viajes</h3>
                <span style={{ color: "var(--text2)", fontSize: 13 }}>{sortedTrips.length} viajes</span>
              </div>
              <div style={{
                maxHeight: 500,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--surface)",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Fecha", "Tipo", "Tarifa", "Distancia", "Duración", "Origen", "Destino"].map(h => (
                        <th key={h} style={{
                          position: "sticky" as const,
                          top: 0,
                          background: "var(--surface)",
                          textAlign: "left",
                          padding: "10px 12px",
                          fontSize: 11,
                          textTransform: "uppercase" as const,
                          letterSpacing: ".5px",
                          color: "var(--text2)",
                          borderBottom: "1px solid var(--border)",
                          fontWeight: 600,
                          zIndex: 1,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrips.map(t => {
                      const badgeColors: Record<string, { bg: string; color: string }> = {
                        Moto: { bg: "rgba(243,156,18,.15)", color: "#f39c12" },
                        UberX: { bg: "rgba(39,110,241,.15)", color: "#4a8bf5" },
                        "Wait & Save": { bg: "rgba(46,204,113,.15)", color: "#2ecc71" },
                        Cancelado: { bg: "rgba(231,76,60,.15)", color: "#e74c3c" },
                      }
                      const bc = badgeColors[t.product_type] || { bg: "rgba(255,255,255,.08)", color: "var(--text2)" }
                      return (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", fontSize: 13, whiteSpace: "nowrap" as const }}>
                          {fmtDate(t.date)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 13 }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: bc.bg,
                            color: bc.color,
                          }}>
                            {t.product_type}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 13 }}>{fmtCurrency(t.fare)}</td>
                        <td style={{ padding: "8px 12px", fontSize: 13, color: "var(--text2)" }}>
                          {t.distance ? t.distance.toFixed(1) + " km" : "-"}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 13, color: "var(--text2)" }}>
                          {fmtDuration(t.duration)}
                        </td>
                        <td style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "var(--text2)",
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                        }}>
                          {t.pickup || "-"}
                        </td>
                        <td style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "var(--text2)",
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                        }}>
                          {t.dropoff || "-"}
                        </td>
                      </tr>
                    )
                  })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button
                  onClick={exportCSV}
                  style={{
                    padding: "6px 14px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text2)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Exportar CSV
                </button>
                <button
                  onClick={exportJSON}
                  style={{
                    padding: "6px 14px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text2)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Exportar JSON
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
