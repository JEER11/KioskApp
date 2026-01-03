import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './WeatherHeader.css';

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

    // Get weather icon based on weather condition and time of day
    const getWeatherIcon = () => {
        if (!weather || !weather.weather || weather.weather.length === 0) {
            return '☀️'; // Default sun icon
        }

        const weatherCode = weather.weather[0].id;
        const isDay = weather.weather[0].icon.includes('d');

        // Thunderstorm (200-232)
        if (weatherCode >= 200 && weatherCode < 300) {
            return '⛈️';
        }
        // Drizzle (300-321)
        if (weatherCode >= 300 && weatherCode < 400) {
            return '🌦️';
        }
        // Rain (500-531)
        if (weatherCode >= 500 && weatherCode < 600) {
            return '🌧️';
        }
        // Snow (600-622)
        if (weatherCode >= 600 && weatherCode < 700) {
            return '❄️';
        }
        // Atmosphere (701-781) - fog, mist, etc.
        if (weatherCode >= 700 && weatherCode < 800) {
            return '🌫️';
        }
        // Clear (800)
        if (weatherCode === 800) {
            return isDay ? '☀️' : '🌙';
        }
        // Clouds (801-804)
        if (weatherCode > 800 && weatherCode < 900) {
            if (weatherCode === 801) {
                return isDay ? '🌤️' : '🌙';
            } else if (weatherCode === 802) {
                return '⛅';
            } else {
                return '☁️';
            }
        }

        return isDay ? '☀️' : '🌙';
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
        const fahrenheit = (weather.main.temp * 9/5) + 32;
        return Math.round(fahrenheit);
    };

    return (
        <div className="weather-header">
            <div className="weather-header-search">
                {/* Placeholder div for search - the actual search modal will render here */}
            </div>
            <div className="weather-header-content">
                <div className="time-date-section">
                    <span className="time">{formatTime()}</span>
                    <span className="date">{formatDate()}</span>
                </div>
                
                {!loading && (
                    <div className="weather-section">
                        <div className="weather-icon">{getWeatherIcon()}</div>
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
