import { useState, useEffect } from 'react';
//import PropTypes from 'prop-types';
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

const WeatherHeader = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Demo-safe fallback weather.
    // No OpenWeather API call, so no 429 errors.
    const [weather] = useState({
        main: { temp: 72 },
        weather: [{ id: 800, icon: '01d' }]
    });

    const [loading] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    const getWeatherClass = () => {
        if (!weather || !weather.weather || weather.weather.length === 0) {
            return 'sunny-day';
        }

        const weatherCode = weather.weather[0].id;
        const isDay = weather.weather[0].icon.includes('d');
        const hour = currentTime.getHours();
        const isSunsetSunrise = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);

        if (weatherCode >= 200 && weatherCode < 300) {
            return 'thunderstorm';
        }

        if ((weatherCode >= 300 && weatherCode < 400) || (weatherCode >= 500 && weatherCode < 600)) {
            return isDay ? 'rainy-day' : 'rainy-night';
        }

        if (weatherCode >= 600 && weatherCode < 700) {
            return 'snowy';
        }

        if (weatherCode >= 700 && weatherCode < 800) {
            return 'foggy';
        }

        if (weatherCode === 800) {
            if (isSunsetSunrise) return 'sunset';
            return isDay ? 'sunny-day' : 'clear-night';
        }

        if (weatherCode > 800 && weatherCode < 900) {
            return isDay ? 'cloudy-day' : 'cloudy-night';
        }

        return isDay ? 'sunny-day' : 'clear-night';
    };

    const getWeatherIcon = () => {
        if (!weather || !weather.weather || weather.weather.length === 0) {
            return <WiDaySunny />;
        }

        const weatherCode = weather.weather[0].id;
        const isDay = weather.weather[0].icon.includes('d');

        if (weatherCode >= 200 && weatherCode < 300) {
            return isDay ? <WiDayThunderstorm /> : <WiNightThunderstorm />;
        }

        if (weatherCode >= 300 && weatherCode < 400) {
            return isDay ? <WiDayRain /> : <WiNightRain />;
        }

        if (weatherCode >= 500 && weatherCode < 600) {
            return isDay ? <WiDayRain /> : <WiNightRain />;
        }

        if (weatherCode >= 600 && weatherCode < 700) {
            return <WiSnow />;
        }

        if (weatherCode >= 700 && weatherCode < 800) {
            return <WiFog />;
        }

        if (weatherCode === 800) {
            return isDay ? <WiDaySunny /> : <WiNightClear />;
        }

        if (weatherCode > 800 && weatherCode < 900) {
            if (weatherCode === 801 || weatherCode === 802) {
                return isDay ? <WiDayCloudy /> : <WiNightAltCloudy />;
            }

            return <WiCloudy />;
        }

        return isDay ? <WiDaySunny /> : <WiNightClear />;
    };

    const formatTime = () => {
        return currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const formatDate = () => {
        return currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getTemperature = () => {
        if (!weather || !weather.main) {
            return '--';
        }

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
//    location: PropTypes.shape({
//        lat: PropTypes.number.isRequired,
//        lon: PropTypes.number.isRequired
//    }),
//    apiKey: PropTypes.string
};

export default WeatherHeader;

