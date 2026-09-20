import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Timeline.css'

function Timeline({ matchId, matchData, playbackTime = 0, onPlaybackTimeChange }) {
  const [timeline, setTimeline] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (!matchId) return

    const fetchTimeline = async () => {
      try {
        const response = await axios.get(`/api/timeline/${matchId}`)
        setTimeline(response.data)
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
      onPlaybackTimeChange(prev => {
        if (prev >= timeline.duration) {
          setIsPlaying(false)
          return prev
        }
        return prev + 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, timeline, onPlaybackTimeChange])

  if (!timeline) {
    return <div className="timeline">Loading...</div>
  }

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const currentEvents = timeline.events.filter(e => e.timestamp <= playbackTime)
  const kills = currentEvents.filter(e => e.event_type.includes('Kill')).length
  const deaths = currentEvents.filter(e => e.event_type.includes('Killed')).length
  const loots = currentEvents.filter(e => e.event_type === 'Loot').length

  return (
    <div className="timeline">
      <div className="timeline-stats">
        <div className="stat">
          <span className="label">Kills</span>
          <span className="value">{kills}</span>
        </div>
        <div className="stat">
          <span className="label">Deaths</span>
          <span className="value">{deaths}</span>
        </div>
        <div className="stat">
          <span className="label">Loots</span>
          <span className="value">{loots}</span>
        </div>
        <div className="stat">
          <span className="label">Time</span>
          <span className="value">{formatTime(playbackTime)} / {formatTime(timeline.duration)}</span>
        </div>
      </div>

      <div className="timeline-controls">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => onPlaybackTimeChange(0)}>
          ⏮ Reset
        </button>
      </div>

      <div className="timeline-slider">
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
      </div>
    </div>
  )
}

export default Timeline
