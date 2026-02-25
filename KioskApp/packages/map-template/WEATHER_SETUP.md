# How to Set Up the Weather Header

The weather header has been added to your map template. To get it working with live weather data:

## 1. Get a Weather API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key

## 2. Configure Your Environment

Create a `.env` file in the `web-ui-main/packages/map-template` folder with your API key:

```
VITE_OPENWEATHER_API_KEY=your-api-key-here
```

You can copy `.env.example` to `.env` and fill in your keys.

## 3. Restart Your Development Server

After adding the API key, restart your development server for the changes to take effect.

## Features

The weather header displays:
- ⏰ Current time (24-hour format, updates every minute)
- 📅 Current date (Day, Date Month Year)
- 🌤️ Dynamic weather icon (changes based on weather conditions and time of day)
- 🌡️ Current temperature in Celsius
- 🌍 Language indicator (EN)

### Weather Icons

The component automatically displays different icons based on conditions:
- ☀️ Sun (clear day)
- 🌙 Moon (clear night)
- 🌤️ Partly cloudy (day)
- ⛅ Partly cloudy
- ☁️ Cloudy
- 🌧️ Rain
- ⛈️ Thunderstorm
- ❄️ Snow
- 🌫️ Fog/Mist

## Customization

To change the location for weather data, edit the location prop in [src/App.jsx](src/App.jsx):

```jsx
<WeatherHeader 
    location={{ lat: YOUR_LATITUDE, lon: YOUR_LONGITUDE }}
    apiKey={import.meta.env.VITE_OPENWEATHER_API_KEY}
/>
```
