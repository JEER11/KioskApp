import './App.css';
import MapsIndoorsMap from './components/MapsIndoorsMap/MapsIndoorsMap';

function App() {
    return (
        <div className="app">
            {/* This is the Map Template component */}
            <MapsIndoorsMap supportsUrlParameters={true}
                apiKey={import.meta.env.VITE_MAPSINDOORS_API_KEY}
                // Leave venue unset so we can force the center to Newark even with the demo solution
                venue={import.meta.env.VITE_VENUE || ""}
                gmApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                // Force provider selection by keys (Google since Mapbox token is empty)
                useMapProviderModule={false}
                logo={"/Loading.png"}
                primaryColor={"#C00000"}
                // Default to NJIT Newark campus when no env override is set
                center={import.meta.env.VITE_CENTER ?? "-74.1780,40.7420"}
                // Zoom in to campus on load
                startZoomLevel={18}
                // Ensure searches stay within MapsIndoors data only
                searchExternalLocations={false}
                // Improve base map legibility
                showRoadNames={true}
                showMapMarkers={true}
                // Use a clearer Mapbox style for buildings/labels
                mapboxMapStyle={"mapbox://styles/mapbox/streets-v12"}
            />
        </div>
    );
}

export default App;