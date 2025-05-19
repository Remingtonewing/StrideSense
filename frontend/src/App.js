import React, { useEffect, useState } from "react";
import "./App.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [activities, setActivities] = useState([]);
  const [map, setMap] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    setAccessToken(token);

    if (token) {
      fetch(`http://localhost:8000/activities?access_token=${token}`)
        .then(res => res.json())
        .then(data => setActivities(data));
    }
  }, []);

  const showHeatmap = async (activityId) => {
    const res = await fetch(`http://localhost:8000/heatmap/${activityId}?access_token=${accessToken}`);
    const data = await res.json();

    const mapInstance = map || L.map('map').setView([26.65, -80.25], 15);
    if (!map) setMap(mapInstance);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapInstance);

    data.points.forEach((point, i) => {
      if (i < data.points.length - 1) {
        const p1 = [point.lat, point.lng];
        const p2 = [data.points[i + 1].lat, data.points[i + 1].lng];
        const color = getColor(point.hr);

        L.polyline([p1, p2], {
          color,
          weight: 5,
          opacity: 0.8
        }).addTo(mapInstance);
      }
    });
  };

  const getColor = (hr) => {
    if (hr > 185) return 'red';
    if (hr > 170) return 'orange';
    if (hr > 150) return 'yellow';
    return 'green';
  };

  return (
    <div className="App">
      <h1>Strava Heatmap Viewer</h1>
      {!accessToken && <p>Please <a href="http://localhost:8000/login">log in with Strava</a>.</p>}
      <div>
        {activities.map(a => (
          <button key={a.id} onClick={() => showHeatmap(a.id)}>
            {a.name} ({(a.distance / 1000).toFixed(2)} km)
          </button>
        ))}
      </div>
      <div id="map" style={{ height: "500px", marginTop: "20px" }}></div>
    </div>
  );
}

export default App;
