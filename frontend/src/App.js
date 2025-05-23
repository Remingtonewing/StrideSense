// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [activities, setActivities] = useState([]);
  const [map, setMap] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterColor, setFilterColor] = useState(null);
  const [timeFrame, setTimeFrame] = useState(null);
  const [lastActivityId, setLastActivityId] = useState(null);
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("access_token");
  
    if (urlToken) {
      localStorage.setItem("access_token", urlToken);
      setAccessToken(urlToken);
    } else {
      const storedToken = localStorage.getItem("access_token");
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
  }, []);
  

  useEffect(() => {
    if (lastActivityId) {
      showHeatmap(lastActivityId);
    }
  }, [filterColor]);

  const showHeatmap = async (activityId) => {
    const detectedAnomalies = [];
    const activity = activities.find((a) => a.id === activityId);
    setSelectedActivity(activity);
    setLastActivityId(activityId);
    setAnomalies(detectedAnomalies);

    const res = await fetch(
      `http://localhost:8000/heatmap/${activityId}?access_token=${accessToken}`
    );
    const data = await res.json();

    const mapInstance =
      map || L.map("map").setView([26.65, -75], 15);
    if (!map) setMap(mapInstance);

    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.TileLayer) {
        mapInstance.removeLayer(layer);
      }
    });
    if (data.points.length > 0) {
      const midIndex = Math.floor(data.points.length / 2);
      const centerPoint = data.points[midIndex];
      mapInstance.setView([centerPoint.lat, centerPoint.lng], 15.5);
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(mapInstance);

    let segmentPoints = [];
    let currentColor = null;
    let startIndex = 0;

    for (let i = 0; i < data.points.length; i++) {
      const point = data.points[i];
      const pointColor = getColor(point.hr);

      if (currentColor === null) {
        currentColor = pointColor;
        startIndex = i;
      }

      const colorMatch = pointColor === currentColor;
      const endOfSegment = !colorMatch || i === data.points.length - 1;

      segmentPoints.push([point.lat, point.lng]);

      if (endOfSegment && segmentPoints.length > 1) {
        // HR spike and acceleration anomaly detection
        for (let j = startIndex + 1; j <= i; j++) {
          const prev = data.points[j - 1];
          const curr = data.points[j];
          const hrSpike = Math.abs(curr.hr - prev.hr) > 10;
          const dt = curr.time - prev.time || 1;
          const prevSpeed = L.latLng(prev.lat, prev.lng).distanceTo(L.latLng(curr.lat, curr.lng)) / dt;
          const nextSpeed = j + 1 <= i ?
            L.latLng(curr.lat, curr.lng).distanceTo(L.latLng(data.points[j + 1].lat, data.points[j + 1].lng)) / (data.points[j + 1].time - curr.time || 1) : prevSpeed;
          const accel = nextSpeed - prevSpeed;

          if (hrSpike || Math.abs(accel) > 1.5) {
            detectedAnomalies.push({
              index: j,
              lat: curr.lat,
              lng: curr.lng,
              time: curr.time,
              hr: curr.hr,
              type: hrSpike ? 'HR Spike' : 'Acceleration Anomaly'
            });
          }
        }
        if (!filterColor || filterColor === currentColor) {
          const polyline = L.polyline(segmentPoints, {
            color: currentColor,
            weight: 5,
            opacity: 0.8,
          }).addTo(mapInstance);

          const segmentData = data.points.slice(startIndex, i + 1);
          const start = segmentData[0];
          const end = segmentData[segmentData.length - 1];
          const avgHR = (
            segmentData.reduce((sum, p) => sum + (p.hr || 0), 0) / segmentData.length
          ).toFixed(1);

          const duration = segmentData.reduce((acc, cur, idx, arr) => {
            if (idx === 0) return 0;
            return acc + (cur.time - arr[idx - 1].time);
          }, 0).toFixed(1);

          const distance = segmentData.reduce((acc, cur, idx, arr) => {
            if (idx === 0) return 0;
            return acc + L.latLng(arr[idx - 1].lat, arr[idx - 1].lng).distanceTo(L.latLng(cur.lat, cur.lng));
          }, 0).toFixed(2);

          const speed = duration > 0 ? (distance / duration).toFixed(2) : "N/A";

          polyline.on("click", () => {
            L.popup()
              .setLatLng([start.lat, start.lng])
              .setContent(
                `<strong>Segment Info</strong><br/>
                Distance: ${distance}m<br/>
                Avg HR: ${avgHR} bpm<br/>
                Duration: ${duration}s<br/>
                Avg Speed: ${speed} m/s`
              )
              .openOn(mapInstance);
          });
        }
        segmentPoints = [[point.lat, point.lng]];
        currentColor = pointColor;
        startIndex = i;
      }
    }
  };

  const getColor = (hr) => {
    if (hr > 185) return "red";
    if (hr > 170) return "orange";
    if (hr > 150) return "yellow";
    return "green";
  };

  return (
    <div className="App">
      <h1>Strava Heatmap Viewer</h1>
      {!accessToken && (
        <p>
          Please <a href="http://localhost:8000/login">log in with Strava</a>.
        </p>
      )}

      <div>
        {activities.map((a) => (
          <button key={a.id} onClick={() => showHeatmap(a.id)}>
            {a.name} ({(a.distance / 1000).toFixed(2)} km)
          </button>
        ))}
      </div>

      <div style={{ marginTop: "15px" }}>
        <span>Filter by HR zone: </span>
        {['green', 'yellow', 'orange', 'red', 'black'].map(c => (
          <button
            key={c}
            onClick={() => setFilterColor(filterColor === c ? null : c)}
            style={{ backgroundColor: c, color: "white", margin: "0 5px" }}
          >
            {filterColor === c ? "✓ " : ""}{c.toUpperCase()}
          </button>
        ))}
      </div>

      {timeFrame && (
        <p style={{ marginTop: "10px" }}><strong>Time Frame:</strong> {timeFrame}</p>
      )}

      {selectedActivity && (
        <div
          style={{
            textAlign: "left",
            margin: "20px auto",
            maxWidth: "600px",
            backgroundColor: "#f9f9f9",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <h2>Run Summary</h2>
          <p><strong>{selectedActivity.name}</strong></p>
          <p><strong>Date:</strong> {new Date(selectedActivity.start_date_local).toLocaleString()}</p>
          <p><strong>Distance:</strong> {(selectedActivity.distance / 1000).toFixed(2)} km</p>
          <p><strong>Avg Heart Rate:</strong> {selectedActivity.average_heartrate} bpm</p>
          <p><strong>Max Speed:</strong> {selectedActivity.max_speed.toFixed(2)} m/s</p>
          <p><strong>Suffer Score:</strong> {selectedActivity.suffer_score}</p>
        </div>
      )}

      <div id="map" style={{ height: "500px", marginTop: "20px" }}></div>
    </div>
  );
}

export default App;
