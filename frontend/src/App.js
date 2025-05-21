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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    setAccessToken(token);

    if (token) {
      fetch(`http://localhost:8000/activities?access_token=${token}`)
        .then((res) => res.json())
        .then((data) => setActivities(data));
    }
  }, []);

  useEffect(() => {
    if (lastActivityId) {
      showHeatmap(lastActivityId);
    }
  }, [filterColor]);

  const showHeatmap = async (activityId) => {
    const activity = activities.find((a) => a.id === activityId);
    setSelectedActivity(activity);
    setLastActivityId(activityId);

    const res = await fetch(
      `http://localhost:8000/heatmap/${activityId}?access_token=${accessToken}`
    );
    const data = await res.json();

    const mapInstance =
      map || L.map("map").setView([26.65, -80.25], 15);
    if (!map) setMap(mapInstance);

    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.TileLayer) {
        mapInstance.removeLayer(layer);
      }
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(mapInstance);

    for (let i = 0; i < data.points.length - 1; i++) {
      const p1 = data.points[i];
      const p2 = data.points[i + 1];
      const color = getColor(p1.hr);
      const time = p1.time;

      const isHRAnomaly =
        i + 5 < data.points.length &&
        data.points[i + 5].hr - p1.hr > 10;

      const velocity1 = p1.distance / (p1.time + 1);
      const velocity2 = p2.distance / (p2.time + 1);
      const accel = velocity2 - velocity1;
      const isAccelAnomaly = Math.abs(accel) > 1.5;

      const isVisible =
        !filterColor || color === filterColor || (filterColor === "black" && (isHRAnomaly || isAccelAnomaly));

      if (isVisible) {
        const segment = L.polyline(
          [
            [p1.lat, p1.lng],
            [p2.lat, p2.lng],
          ],
          {
            color: isHRAnomaly || isAccelAnomaly ? "black" : color,
            weight: 5,
            opacity: 0.8,
          }
        ).addTo(mapInstance);

        segment.on("click", () => {
          const avgHR = (p1.hr + p2.hr) / 2;
          const distance = (p2.distance - p1.distance).toFixed(2);
          const duration = p2.time - p1.time;
          const speed = duration > 0 ? (distance / duration).toFixed(2) : "N/A";
          L.popup()
            .setLatLng([p1.lat, p1.lng])
            .setContent(
              `<strong>Segment Info</strong><br/>
              Distance: ${distance}m<br/>
              Avg HR: ${avgHR} bpm<br/>
              Duration: ${duration}s<br/>
              Avg Speed: ${speed} m/s`
            )
            .openOn(mapInstance);
        });

        if (filterColor) {
          setTimeFrame(`From ${p1.time}s to ${p2.time}s`);
        }
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