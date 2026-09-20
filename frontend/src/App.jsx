import React, { useState, useEffect } from 'react'
import axios from 'axios'
import MapViewer from './components/MapViewer'
import MatchFilter from './components/MatchFilter'
import Timeline from './components/Timeline'
import './App.css'

function App() {
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchData, setMatchData] = useState(null)
  const [mapFilter, setMapFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapType, setHeatmapType] = useState('traffic')
  const [playbackTime, setPlaybackTime] = useState(0)

  useEffect(() => {
    fetchMatches()
  }, [mapFilter, dateFilter])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (mapFilter) params.append('map', mapFilter)
      if (dateFilter) params.append('date', dateFilter)

      const response = await axios.get(`/api/matches?${params}`)
      setMatches(response.data)
    } catch (error) {
      console.error('Error fetching matches:', error)
    }
    setLoading(false)
  }

  const handleSelectMatch = async (matchId) => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/match/${matchId}`)
      setSelectedMatch(matchId)
      setMatchData(response.data)
    } catch (error) {
      console.error('Error fetching match data:', error)
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚫ LILA BLACK - Player Journey Visualization</h1>
        <p>Explore player behavior and map dynamics</p>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <MatchFilter
            mapFilter={mapFilter}
            dateFilter={dateFilter}
            onMapChange={setMapFilter}
            onDateChange={setDateFilter}
            loading={loading}
          />

          <div className="matches-list">
            <h3>Matches ({matches.length})</h3>
            <div className="matches-scroll">
              {matches.map((match) => (
                <div
                  key={match.match_id}
                  className={`match-item ${selectedMatch === match.match_id ? 'active' : ''}`}
                  onClick={() => handleSelectMatch(match.match_id)}
                >
                  <div className="match-title">{match.map_id}</div>
                  <div className="match-meta">
                    {match.date} • {match.total_players} players
                  </div>
                  <div className="match-players">
                    <span className="human">👤 {match.human_players}</span>
                    <span className="bot">🤖 {match.bot_players}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-content">
          {selectedMatch && matchData ? (
            <>
              <div className="controls">
                <button
                  className={`btn-heatmap ${showHeatmap ? 'active' : ''}`}
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  🔥 Heatmap
                </button>
                {showHeatmap && (
                  <select
                    value={heatmapType}
                    onChange={(e) => setHeatmapType(e.target.value)}
                  >
                    <option value="traffic">Traffic</option>
                    <option value="kills">Kills</option>
                    <option value="deaths">Deaths</option>
                  </select>
                )}
              </div>

              <MapViewer
                matchData={matchData}
                showHeatmap={showHeatmap}
                heatmapType={heatmapType}
                playbackTime={playbackTime}
              />

              <Timeline
                matchId={selectedMatch}
                matchData={matchData}
                playbackTime={playbackTime}
                onPlaybackTimeChange={setPlaybackTime}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>Select a match to view player journeys</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
