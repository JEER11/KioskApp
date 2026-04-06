import { useRecoilValue } from 'recoil';
import './SplashScreen.scss';
import logoState from '../../atoms/logoState';

/**
 * Creates the splash screen loading initially in the app.
 * The default color and logo are MapsIndoors' visual identity.
 */
function SplashScreen() {
    const logo = useRecoilValue(logoState);

    return (
        <div className="splash-screen">
            <div className="splash-screen__container">
                <img className={'splash-screen__logo ' + (logo ? 'splash-screen__logo--visible' : '')}
                    src={logo}
                    alt=""
                />
                <img
                    className="splash-screen__loader"
                    src="/pulse-multiple.svg"
                    alt="Loading"
                />
            </div>
        </div>
    )
}

export default SplashScreen;