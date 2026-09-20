import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './Timeline.css'

const SPEEDS = [1, 10, 30, 60]
const TICK_MS = 100

function Timeline({ matchId, playbackTime = 0, onPlaybackTimeChange }) {
  const [timeline, setTimeline] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(30)
  const playbackTimeRef = useRef(playbackTime)

  useEffect(() => {
    playbackTimeRef.current = playbackTime
  }, [playbackTime])

  useEffect(() => {
    if (!matchId) return

    const fetchTimeline = async () => {
      try {
        const response = await axios.get(`/api/timeline/${matchId}`)
        setTimeline(response.data)
        setIsPlaying(false)
        onPlaybackTimeChange(0)
      } catch (error) {
        console.error('Error fetching timeline:', error)
      }
    }

    fetchTimeline()
  }, [matchId, onPlaybackTimeChange])

  useEffect(() => {
    if (!isPlaying || !timeline) return

    const interval = setInterval(() => {
      const nextTime = playbackTimeRef.current + TICK_MS * speed
      if (nextTime >= timeline.duration) {
        onPlaybackTimeChange(timeline.duration)
        setIsPlaying(false)
      } else {
        onPlaybackTimeChange(nextTime)
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [isPlaying, timeline, speed, onPlaybackTimeChange])

  if (!timeline) {
    return <div className="timeline timeline-loading">Loading timeline…</div>
  }

  const formatTime = (ms) => {
    const total = Math.floor(ms / 1000)
    const minutes = Math.floor(total / 60)
    const seconds = total % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const seen = timeline.events.filter((e) => e.timestamp <= playbackTime)
  const kills = seen.filter((e) => e.event_type === 'Kill' || e.event_type === 'BotKill').length
  const deaths = seen.filter(
    (e) => e.event_type === 'Killed' || e.event_type === 'BotKilled' || e.event_type === 'KilledByStorm'
  ).length
  const loots = seen.filter((e) => e.event_type === 'Loot').length

  const handleReset = () => {
    setIsPlaying(false)
    onPlaybackTimeChange(0)
  }

  return (
    <div className="timeline">
      <div className="timeline-bar">
        <button className="transport" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="transport" onClick={handleReset} title="Reset">
          ⏮
        </button>

        <span className="time-readout">
          {formatTime(playbackTime)} <span className="time-total">/ {formatTime(timeline.duration)}</span>
        </span>

        <input
          type="range"
          min="0"
          max={timeline.duration}
          value={playbackTime}
          onChange={(e) => {
            onPlaybackTimeChange(Number(e.target.value))
            setIsPlaying(false)
          }}
          className="slider"
        />

        <select className="speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        <div className="inline-stats">
          <span className="chip kills">{kills} kills</span>
          <span className="chip deaths">{deaths} deaths</span>
          <span className="chip loots">{loots} loot</span>
        </div>
      </div>
    </div>
  )
}

export default Timeline
