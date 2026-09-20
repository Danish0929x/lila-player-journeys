import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './MatchFilter.css'

function MatchFilter({ mapFilter, dateFilter, onMapChange, onDateChange, loading }) {
  const [maps, setMaps] = useState([])
  const [dates, setDates] = useState([])

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const response = await axios.get('/api/maps')
        setMaps(Object.keys(response.data))
      } catch (error) {
        console.error('Error fetching maps:', error)
      }
    }
    fetchMaps()
  }, [])

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const response = await axios.get('/api/matches')
        const uniqueDates = [...new Set(response.data.map(m => m.date))].sort().reverse()
        setDates(uniqueDates)
      } catch (error) {
        console.error('Error fetching dates:', error)
      }
    }
    fetchDates()
  }, [])

  return (
    <div className="match-filter">
      <h3>Filters</h3>

      <div className="filter-group">
        <label>Map</label>
        <select value={mapFilter} onChange={(e) => onMapChange(e.target.value)}>
          <option value="">All Maps</option>
          {maps.map(map => (
            <option key={map} value={map}>{map}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Date</label>
        <select value={dateFilter} onChange={(e) => onDateChange(e.target.value)}>
          <option value="">All Dates</option>
          {dates.map(date => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading...</div>}
    </div>
  )
}

export default MatchFilter
