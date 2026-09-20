import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import './MapViewer.css'

function MapViewer({ matchData, showHeatmap, heatmapType, playbackTime = 0 }) {
  const canvasRef = useRef(null)
  const [minimap, setMinimap] = useState(null)
  const [heatmapData, setHeatmapData] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const getEventsUpToTime = (events, maxTime) => {
    if (maxTime === 0) return events  // Show all events initially
    const maxTimeSeconds = maxTime / 1000  // Convert ms to seconds
    return events.filter(e => e.timestamp <= maxTimeSeconds)
  }

  useEffect(() => {
    if (!matchData) return

    const mapId = matchData.map_id
    const img = new Image()

    img.src = `/api/minimap/${mapId}`
    img.onload = () => setMinimap(img)
    img.onerror = () => console.error(`Failed to load minimap for ${mapId}`)
  }, [matchData])

  useEffect(() => {
    if (showHeatmap && matchData) {
      fetchHeatmap()
    }
  }, [showHeatmap, heatmapType, matchData])

  const fetchHeatmap = async () => {
    try {
      const response = await axios.get(`/api/heatmap/${matchData.match_id}?type=${heatmapType}`)
      setHeatmapData(response.data)
    } catch (error) {
      console.error('Error fetching heatmap:', error)
    }
  }

  useEffect(() => {
    if (!minimap || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Set canvas size directly to 1024x1024 (no DPI scaling for now)
    canvas.width = 1024
    canvas.height = 1024

    // Draw minimap
    ctx.drawImage(minimap, 0, 0, 1024, 1024)

    // Draw heatmap if enabled
    if (showHeatmap && heatmapData) {
      drawHeatmap(ctx, heatmapData)
    }

    // Draw player paths and events
    if (matchData && matchData.players && matchData.players.length > 0) {
      matchData.players.forEach((player, idx) => {
        const color = player.is_bot ? '#FFB300' : '#4A90FF'
        // Filter events based on playback time
        const filteredPlayer = {
          ...player,
          events: playbackTime > 0 ? getEventsUpToTime(player.events, playbackTime) : player.events
        }
        drawPlayerPath(ctx, filteredPlayer, color, selectedPlayer === player.user_id)
      })
    }
  }, [minimap, matchData, showHeatmap, heatmapData, selectedPlayer, playbackTime])

  const drawPlayerPath = (ctx, player, color, isSelected) => {
    const events = player.events || []

    if (events.length === 0) {
      console.log(`Player ${player.user_id} has no events`)
      return
    }

    console.log(`Drawing ${player.user_id}: ${events.length} events, first pos:`, events[0]?.position)

    // Draw path line
    if (events.length > 1) {
      ctx.strokeStyle = isSelected ? '#FFFFFF' : color
      ctx.lineWidth = isSelected ? 3 : 2.5
      ctx.globalAlpha = isSelected ? 1 : 0.8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()

      let pointCount = 0
      for (let i = 0; i < events.length; i++) {
        const pos = events[i].position
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          if (pointCount === 0) {
            ctx.moveTo(pos.x, pos.y)
          } else {
            ctx.lineTo(pos.x, pos.y)
          }
          pointCount++
        }
      }
      console.log(`Drew ${pointCount} points for player ${player.user_id}`)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Draw events as markers (only for non-Position events)
    events.forEach(event => {
      if (!event.position || event.event === 'Position' || event.event === 'BotPosition') return

      const { x, y } = event.position
      const eventType = event.event

      ctx.globalAlpha = 1

      // Draw event marker
      if (eventType === 'Kill' || eventType === 'BotKill') {
        ctx.fillStyle = '#FF1111'
        ctx.fillRect(x - 5, y - 5, 10, 10)
      } else if (eventType === 'Killed' || eventType === 'BotKilled') {
        ctx.fillStyle = '#FF3333'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
      } else if (eventType === 'KilledByStorm') {
        ctx.fillStyle = '#00FFFF'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
      } else if (eventType === 'Loot') {
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    })

    // Draw start/end markers
    if (events.length > 0) {
      const startPos = events[0].position
      if (startPos) {
        ctx.fillStyle = '#00FF00'
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(startPos.x, startPos.y, 8, 0, Math.PI * 2)
        ctx.fill()
      }

      const endPos = events[events.length - 1].position
      if (endPos) {
        ctx.fillStyle = '#FF0000'
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(endPos.x, endPos.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.stroke()
      }
    }
  }

  const drawHeatmap = (ctx, heatmapData) => {
    const gridSize = heatmapData.grid_size
    const heatmap = heatmapData.heatmap

    for (const [key, intensity] of Object.entries(heatmap)) {
      const [x, y] = key.split(',').map(Number)
      const pixelX = x * gridSize
      const pixelY = y * gridSize

      // Color based on intensity (blue -> red gradient)
      const hue = (1 - intensity) * 240 // 240 (blue) to 0 (red)
      const rgb = hslToRgb(hue, 100, 50)

      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
      ctx.fillRect(pixelX, pixelY, gridSize, gridSize)
    }
  }

  const hslToRgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100)
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = (l / 100) - (c / 2)

    let r, g, b
    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else [r, g, b] = [c, 0, x]

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    }
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (!matchData) return

    // Find clicked player
    for (const player of matchData.players) {
      for (const event of player.events) {
        if (event.position) {
          const dist = Math.sqrt(
            Math.pow(event.position.x - x, 2) + Math.pow(event.position.y - y, 2)
          )
          if (dist < 10) {
            setSelectedPlayer(player.user_id)
            return
          }
        }
      }
    }
    setSelectedPlayer(null)
  }

  return (
    <div className="map-viewer">
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        onClick={handleCanvasClick}
      />
      {selectedPlayer && matchData && (
        <div className="player-info">
          <div>
            {matchData.players.find(p => p.user_id === selectedPlayer)?.is_bot ? '🤖' : '👤'}
            {selectedPlayer.substring(0, 8)}...
          </div>
          <button onClick={() => setSelectedPlayer(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

export default MapViewer
