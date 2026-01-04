import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './WeatherHeader.css';
import { 
    WiDaySunny, 
    WiNightClear, 
    WiDayCloudy, 
    WiNightAltCloudy,
    WiCloudy, 
    WiSnow, 
    WiFog,
    WiDayRain,
    WiNightRain,
    WiDayThunderstorm,
    WiNightThunderstorm
} from 'react-icons/wi';

const WeatherHeader = ({ location = { lat: 40.7420, lon: -74.1780 }, apiKey }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    // Fetch weather data
    useEffect(() => {
        const fetchWeather = async () => {
            if (!apiKey) {
                console.warn('No weather API key provided');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=imperial&appid=${apiKey}`
                );
                const data = await response.json();
                setWeather(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching weather:', error);
                setLoading(false);
            }
        };

        fetchWeather();
        // Refresh weather every 10 minutes
        const weatherInterval = setInterval(fetchWeather, 600000);

        return () => clearInterval(weatherInterval);
    }, [location, apiKey]);

    // Get weather condition class for styling
    const getWeatherClass = () => {
        if (!weather || !weather.weather || weather.weather.length === 0) {
            return 'sunny-day';
        }

        const weatherCode = weather.weather[0].id;
        const isDay = weather.weather[0].icon.includes('d');
        const hour = currentTime.getHours();
        const isSunsetSunrise = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);

        // Thunderstorm
        if (weatherCode >= 200 && weatherCode < 300) {
            return 'thunderstorm';
        }
        // Rain/Drizzle
        if ((weatherCode >= 300 && weatherCode < 400) || (weatherCode >= 500 && weatherCode < 600)) {
            return isDay ? 'rainy-day' : 'rainy-night';
        }
        // Snow
        if (weatherCode >= 600 && weatherCode < 700) {
            return 'snowy';
        }
        // Fog/Mist
        if (weatherCode >= 700 && weatherCode < 800) {
            return 'foggy';
        }
        // Clear
        if (weatherCode === 800) {
            if (isSunsetSunrise) return 'sunset';
            return isDay ? 'sunny-day' : 'clear-night';
        }
        // Cloudy
        if (weatherCode > 800 && weatherCode < 900) {
            return isDay ? 'cloudy-day' : 'cloudy-night';
        }

        return isDay ? 'sunny-day' : 'clear-night';
    };

    // Get weather icon based on weather condition and time of day
    const getWeatherIcon = () => {
        if (!weather || !weather.weather || weather.weather.length === 0) {
            return <WiDaySunny />; // Default sun icon
        }

        const weatherCode = weather.weather[0].id;
        const isDay = weather.weather[0].icon.includes('d');

        // Thunderstorm (200-232)
        if (weatherCode >= 200 && weatherCode < 300) {
            return isDay ? <WiDayThunderstorm /> : <WiNightThunderstorm />;
        }
        // Drizzle (300-321)
        if (weatherCode >= 300 && weatherCode < 400) {
            return isDay ? <WiDayRain /> : <WiNightRain />;
        }
        // Rain (500-531)
        if (weatherCode >= 500 && weatherCode < 600) {
            return isDay ? <WiDayRain /> : <WiNightRain />;
        }
        // Snow (600-622)
        if (weatherCode >= 600 && weatherCode < 700) {
            return <WiSnow />;
        }
        // Atmosphere (701-781) - fog, mist, etc.
        if (weatherCode >= 700 && weatherCode < 800) {
            return <WiFog />;
        }
        // Clear (800)
        if (weatherCode === 800) {
            return isDay ? <WiDaySunny /> : <WiNightClear />;
        }
        // Clouds (801-804)
        if (weatherCode > 800 && weatherCode < 900) {
            if (weatherCode === 801) {
                return isDay ? <WiDayCloudy /> : <WiNightAltCloudy />;
            } else if (weatherCode === 802) {
                return isDay ? <WiDayCloudy /> : <WiNightAltCloudy />;
            } else {
                return <WiCloudy />;
            }
        }

        return isDay ? <WiDaySunny /> : <WiNightClear />;
    };

    // Format time as HH:MM
    const formatTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Format date as "Monday 20 May 2024"
    const formatDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Get temperature in Fahrenheit
    const getTemperature = () => {
        if (!weather || !weather.main) {
            return '--';
        }
        // API already returns temperature in Fahrenheit (units=imperial)
        return Math.round(weather.main.temp);
    };

    return (
        <div className="weather-header">
            <div className="weather-header-search" id="weather-header-search-portal">
                {/* Search input will be rendered here via portal */}
            </div>
            <div className="weather-header-content">
                <div className="time-date-section">
                    <span className="time">{formatTime()}</span>
                    <span className="date">{formatDate()}</span>
                </div>
                
                {!loading && (
                    <div className="weather-section">
                        <div className={`weather-icon ${getWeatherClass()}`}>
                            <span className="icon-wrapper">{getWeatherIcon()}</span>
                        </div>
                        <div className="temperature">{getTemperature()}°F</div>
                    </div>
                )}
            </div>
        </div>
    );
};

WeatherHeader.propTypes = {
    location: PropTypes.shape({
        lat: PropTypes.number.isRequired,
        lon: PropTypes.number.isRequired
    }),
    apiKey: PropTypes.string
};

export default WeatherHeader;
